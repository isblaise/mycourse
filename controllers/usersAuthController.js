const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const con = require('../config/db'); // Assuming you have a database configuration file




  exports.register = async (req, res) => {
    try {
      const { name, adresse,phone ,email, password,  } = req.body;
      if (!name || !adresse || !phone || !email || !password) {
        return res.status(400).json({ error: 'Tous les champs sont requis' });
      }
      const userCheckQuery = `SELECT * FROM users WHERE email = ?`;
      const [existingUser] = await con.promise().query(userCheckQuery, [email]);
      if (existingUser.length > 0) {
        return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const insertUserQuery = `INSERT INTO users (name, adresse, phone, email, password) VALUES (?, ?, ?,?,?)`; 
      await con.promise().query(insertUserQuery, [name, adresse,phone ,email, hashedPassword]);
        res.status(201).json({ message: 'Utilisateur enregistré avec succès' });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement :', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  
 
    exports.login = async (req, res) => {
    const { email, password } = req.body;
    const sql = `SELECT * FROM users WHERE email = ?`;
    con.query(sql, [email], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur du serveur' });
      }
      if (results.length === 0) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }
      const user = results[0];
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ error: 'Erreur du serveur' });
        } 
        if (!isMatch) {
          return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        const token = jwt.sign({ id: user.id, email: user.email }, 'secret_key', { expiresIn: '1h' });
        res.status(200).json({ message: 'Connexion réussie', token });
      });
    });
  };

// get user data 
 
    exports.getUserData = async (req, res) => {
    const userId = req.user.id; // ID extrait du token JWT
  
    const sql = `SELECT * FROM users WHERE id = ?`;
    con.query(sql, [userId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
      res.json(results[0]); // Retourne les informations de l'utilisateur
    });
  };
  
  exports.updateUser = async (req, res) => {
    const userId = req.user.id; // ID extrait du token JWT
    const { name, adresse, phone, email } = req.body;
  
    try {
      const updateUserQuery = `
        UPDATE users 
        SET name = ?, adresse = ?, phone = ?, email = ? 
        WHERE id = ?
      `;
  
      const [result] = await con.promise().query(updateUserQuery, [name, adresse, phone, email, userId]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
  
      res.status(200).json({ message: 'Informations utilisateur mises à jour avec succès' });
    } catch (error) {
      console.error('Erreur lors de la mise à jour :', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };


  // change password 

  exports.changePassword = async (req, res) => {
    const userId = req.user.id; // ID extrait du token JWT
    const { currentPassword, newPassword } = req.body;
  
    try {
      const sql = `SELECT * FROM users WHERE id = ?`;   
      const [user] = await con.promise().query(sql, [userId]);
  
      if (user.length === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
  
      const isMatch = await bcrypt.compare(currentPassword, user[0].password);
      if (!isMatch) {       
        return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      const updatePasswordQuery = `UPDATE users SET password = ? WHERE id = ?`;
      await con.promise().query(updatePasswordQuery, [hashedNewPassword, userId]);
  
      res.status(200).json({ message: 'Mot de passe mis à jour avec succès' });     
    } catch (error) {
      console.error('Erreur lors de la mise à jour du mot de passe :', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  };
  

  
