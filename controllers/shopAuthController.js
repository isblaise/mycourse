const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const fs = require('fs').promises;

exports.registerStore = async (req, res) => {
    let connection;
    try {
        const { name, email, password, phone, store_name, adresse, status, long, lat } = req.body;
        const profilePhoto = req.files['profilePhoto']?.[0]?.filename;
        const documentPhoto = req.files['documentPhoto']?.[0]?.filename;

        if (!name || !email || !password || !phone || !store_name || !adresse || !profilePhoto || !documentPhoto) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs sont requis'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [existingShops] = await connection.query(
            'SELECT id FROM shop WHERE email = ?',
            [email]
        );

        if (existingShops.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: 'Un magasin avec cet email existe déjà'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await connection.query(
            `INSERT INTO shop (name, phone, store_name, adresse, email, password, logo, doc, status, longitude, latitude) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, phone, store_name, adresse, email, hashedPassword, profilePhoto, documentPhoto, status, long, lat]
        );

        await connection.commit();
        res.status(201).json({
            success: true,
            message: 'Magasin enregistré avec succès',
            shopId: result.insertId
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erreur inscription magasin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.loginStore = async (req, res) => {
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
        const [shops] = await connection.query(
            'SELECT * FROM shop WHERE email = ? AND status = "verifier"',
            [email]
        );

        if (shops.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Votre compte n\'est pas autorisé à se connecter'
            });
        }

        const isValidPassword = await bcrypt.compare(password, shops[0].password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Identifiants invalides'
            });
        }

        const token = jwt.sign({ id: shops[0].id, email: shops[0].email }, 'secret_key', { expiresIn: '5h' });

        res.json({
            success: true,
            message: 'Connexion réussie',
            token,
            shop: {
                id: shops[0].id,
                name: shops[0].name,
                store_name: shops[0].store_name,
                email: shops[0].email,
                role: shops[0].role
            }
        });

    } catch (error) {
        console.error('Erreur connexion magasin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};
exports.logoutStore = (req, res) => {
    try {
        // Invalidate the token or clear the session
        req.user = null;
        res.json({
            success: true,
            message: 'Déconnexion réussie'
        });
    } catch (error) {
        console.error('Erreur déconnexion magasin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    }
};

exports.updateStoreStatus = async (req, res) => {
    let connection;
    try {
        const shopId = req.params.id;
        const { status } = req.body;

       
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Vérifier si le magasin existe
        const [shops] = await connection.query(
            'SELECT id FROM shop WHERE id = ?',
            [shopId]
        );

        if (shops.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Magasin non trouvé'
            });
        }

        // Mise à jour du statut
        const [result] = await connection.query(
            'UPDATE shop SET status = ? WHERE id = ?',
            [status, shopId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Mise à jour impossible'
            });
        }

        await connection.commit();
        res.json({
            success: true,
            message: 'Statut du magasin mis à jour',
            status: status
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erreur mise à jour statut:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};


exports.updateStore = async (req, res) => {
    let connection;
    try {
        const shopId = req.shop.id;
        const { name, phone, store_name, adresse, email } = req.body;
        const logo = req.file?.filename;

        if (!name || !phone || !store_name || !adresse || !email) {
            return res.status(400).json({
                success: false,
                message: 'Tous les champs sont requis'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Vérifier si l'email existe déjà pour un autre magasin
        const [existingShops] = await connection.query(
            'SELECT id, logo FROM shop WHERE email = ? AND id != ?',
            [email, shopId]
        );

        if (existingShops.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: 'Cet email est déjà utilisé'
            });
        }

        // Mise à jour des informations
        const updateQuery = logo 
            ? 'UPDATE shop SET name = ?, phone = ?, store_name = ?, adresse = ?, email = ?, logo = ? WHERE id = ?'
            : 'UPDATE shop SET name = ?, phone = ?, store_name = ?, adresse = ?, email = ? WHERE id = ?';
        
        const updateParams = logo 
            ? [name, phone, store_name, adresse, email, logo, shopId]
            : [name, phone, store_name, adresse, email, shopId];

        const [result] = await connection.query(updateQuery, updateParams);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Magasin non trouvé'
            });
        }

        // Supprimer l'ancien logo si un nouveau est uploadé
        if (logo && existingShops[0]?.logo) {
            await fs.unlink(`uploads/${existingShops[0].logo}`).catch(() => {});
        }

        await connection.commit();
        res.json({
            success: true,
            message: 'Magasin mis à jour avec succès'
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erreur mise à jour magasin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.getStoreData = async (req, res) => {
    let connection;
    try {
        const shopId = req.user.id;
        
        connection = await db.getConnection();
        const [shops] = await connection.query(
            'SELECT * FROM shop WHERE id = ?',
            [shopId]
        );

        if (shops.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Magasin non trouvé'
            });
        }

        res.json({
            success: true,
            shop: shops[0]
        });

    } catch (error) {
        console.error('Erreur récupération données magasin:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.getShopList = async (req, res) => {
  let connection;
  try {

      connection = await db.getConnection();
      
      // Requête pour obtenir le nombre total de magasins
      const [countResult] = await connection.query('SELECT COUNT(*) as total FROM shop');
      const total = countResult[0].total;

      // Requête pour obtenir les magasins paginés
      const [shops] = await connection.query(
        `SELECT *
         FROM shop
         ORDER BY id DESC`
    );
      res.json({
          success: true,
          shops,
          total
      });
      console.log("shop recuperer",shops);

  } catch (error) {
      console.error('Erreur récupération liste magasins:', error);
      res.status(500).json({
          success: false,
          message: 'Erreur serveur'
      });
  } finally {
      if (connection) connection.release();
  }
};

exports.getShopListVerified = async (req, res) => {
    let connection;
    try {
  
        connection = await db.getConnection();
        
        // Requête pour obtenir le nombre total de magasins
        const [countResult] = await connection.query('SELECT COUNT(*) as total FROM shop');
        const total = countResult[0].total;
  
        // Requête pour obtenir les magasins paginés
        const [shops] = await connection.query(
          `SELECT id, name, store_name, adresse, logo
           FROM shop
           WHERE status = 'verifier'
           ORDER BY id DESC`
      );
        res.json({
            success: true,
            shops,
            total
        });
        console.log("shop recuperer",shops);
  
    } catch (error) {
        console.error('Erreur récupération liste magasins:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
  };

exports.getLatestShops = async (req, res) => {
  let connection;
  try { // Nombre de magasins récents à récupérer

      connection = await db.getConnection();
      const [shops] = await connection.query(
        `SELECT id, name, store_name, adresse, logo
         FROM shop
         WHERE status = 'verifier' 
         ORDER BY id DESC 
         LIMIT 4`
      );

      res.json({
          success: true,
          shops
      });

  } catch (error) {
      console.error('Erreur récupération derniers magasins:', error);
      res.status(500).json({
          success: false,
          message: 'Erreur serveur'
      });
  } finally {
      if (connection) connection.release();
  }
};