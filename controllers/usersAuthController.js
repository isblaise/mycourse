const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Assuming you have a database configuration file


exports.register = async (req, res) => {
    let connection;
    try {
        const { name, adresse, phone, email, password } = req.body;
        
        if (!name || !adresse || !phone || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tous les champs sont requis' 
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [existingUsers] = await connection.query(
            'SELECT id FROM users WHERE email = ?', 
            [email]
        );

        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: 'Cet email existe déjà'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await connection.query(
            'INSERT INTO users (name, adresse, phone, email, password) VALUES (?, ?, ?, ?, ?)',
            [name, adresse, phone, email, hashedPassword]
        );

        await connection.commit();
        res.status(201).json({
            success: true,
            message: 'Inscription réussie',
            userId: result.insertId
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erreur inscription:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.login = async (req, res) => {
    let connection;
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email et mot de passe requis'
            });
        }

        connection = await db.getConnection();
        const [users] = await connection.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Identifiants invalides'
            });
        }

        const isValidPassword = await bcrypt.compare(password, users[0].password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Identifiants invalides'
            });
        }

        const token = jwt.sign(
            { id: users[0].id },
            'secret_key',
            { expiresIn: '70d' }
        );

        res.json({
            success: true,
            message: 'Connexion réussie',
            token,
            user: {
                id: users[0].id,
                name: users[0].name,
                email: users[0].email
            }
        });

    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.adminLogin = async (req, res) => {
    let connection;
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email et mot de passe requis'
            });
        }

        connection = await db.getConnection();
        const [users] = await connection.query(
            'SELECT * FROM users WHERE email = ? AND role = "admin"',
            [email]
        );

        if (users.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        const isValidPassword = await bcrypt.compare(password, users[0].password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Identifiants invalides'
            });
        }

        const token = jwt.sign(
            { 
                id: users[0].id,
                role: users[0].role 
            },
            'secret_key',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Connexion administrateur réussie',
            token,
            admin: {
                id: users[0].id,
                name: users[0].name,
                email: users[0].email,
                role: users[0].role
            }
        });

    } catch (error) {
        console.error('Erreur connexion admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};



exports.changePassword = async (req, res) => {
    let connection;
    try {
        const { userId, currentPassword, newPassword } = req.body;

        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs sont requis'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [users] = await connection.query(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
        if (!isValidPassword) {
            await connection.rollback();
            return res.status(401).json({
                success: false,
                message: 'Mot de passe actuel incorrect'
            });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await connection.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedNewPassword, userId]
        );

        await connection.commit();
        res.json({
            success: true,
            message: 'Mot de passe mis à jour'
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erreur mise à jour mdp:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};
   
 
exports.getUserData = async (req, res) => {
  let connection;
  try {
      const userId = req.user.id;
      
      connection = await db.getConnection();
      const [users] = await connection.query(
          'SELECT * FROM users WHERE id = ?',
          [userId]
      );

      if (users.length === 0) { 
          return res.status(404).json({
              success: false,
              message: 'Utilisateur non trouvé'
          });
      }

      res.json({
          success: true,
          user: users[0]
      });

  } catch (error) {
      console.error('Erreur récupération données:', error);
      res.status(500).json({
          success: false,
          message: 'Erreur serveur'
      });
  } finally {
      if (connection) connection.release();
  }
};

exports.updateUser = async (req, res) => {
  let connection;
  try {
      const userId = req.user.id;
      const { name, adresse, phone, email } = req.body;

      if (!name || !adresse || !phone || !email) {
          return res.status(400).json({
              success: false,
              message: 'Tous les champs sont requis'
          });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      // Vérifier si l'email existe déjà pour un autre utilisateur
      const [existingUsers] = await connection.query(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, userId]
      );

      if (existingUsers.length > 0) {
          await connection.rollback();
          return res.status(409).json({
              success: false,
              message: 'Cet email est déjà utilisé'
          });
      }

      // Mise à jour des informations
      const [result] = await connection.query(
          `UPDATE users 
           SET name = ?, adresse = ?, phone = ?, email = ? 
           WHERE id = ?`,
          [name, adresse, phone, email, userId]
      );

      if (result.affectedRows === 0) {
          await connection.rollback();
          return res.status(404).json({
              success: false,
              message: 'Utilisateur non trouvé'
          });
      }

      await connection.commit();
      res.json({
          success: true,
          message: 'Profil mis à jour avec succès'
      });

  } catch (error) {
      if (connection) await connection.rollback();
      console.error('Erreur mise à jour profil:', error);
      res.status(500).json({
          success: false,
          message: 'Erreur serveur'
      });
  } finally {
      if (connection) connection.release();
  }
};

  
