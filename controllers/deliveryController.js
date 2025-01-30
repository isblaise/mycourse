const con = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// create delivere account
exports.createDelivereAccount = async (req, res) => {
    let connection;
    try {
        connection = await con.getConnection();
        await connection.beginTransaction();

        const { name, email, password, phone, adresse, age, type, modele, statut, disponibilite } = req.body;

        // Vérifier si tous les champs requis sont présents
        if (!name || !email || !password || !phone || !adresse || !age || !type || !modele || !statut || !disponibilite) {
            return res.status(400).json({ error: 'Tous les champs requis doivent être remplis' });
        }

        // Vérifier si tous les fichiers nécessaires sont présents
        if (!req.files['profilPhoto'] || !req.files['cnibPhoto'] || !req.files['cartegrisePhoto'] || !req.files['enginPhoto']) {
            return res.status(400).json({ error: 'Tous les fichiers nécessaires doivent être téléchargés' });
        }

        const profilPhoto = req.files['profilPhoto'][0].filename;
        const cnibPhoto = req.files['cnibPhoto'][0].filename;
        const cartegrisePhoto = req.files['cartegrisePhoto'][0].filename;
        const enginPhoto = req.files['enginPhoto'][0].filename;

        // Vérifier si un livreur existe déjà avec la même adresse email
        const checkEmailQuery = `SELECT * FROM livreur WHERE email = ?`;
        const [existingLivreur] = await connection.query(checkEmailQuery, [email]);

        if (existingLivreur.length > 0) {
            return res.status(409).json({ error: 'Un livreur avec cette adresse email existe déjà' });
        }

        // Hachage du mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insérer un nouveau livreur
        const sql = `INSERT INTO livreur (name, email, password, phone, adresse, age, photo, imm, modele, cnib, statut, carte_grise, engin, disponibilite) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await connection.query(sql, [name, email, hashedPassword, phone, adresse, age, profilPhoto, type, modele, cnibPhoto, statut, cartegrisePhoto, enginPhoto, disponibilite]);

        await connection.commit();
        res.status(201).json({ message: 'Compte livreur créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la création du compte livreur:', error);
        if (connection) await connection.rollback();
        res.status(500).json({ error: 'Erreur serveur lors de la création du compte' });
    } finally {
        if (connection) connection.release();
    }
};

// get delivere data
exports.getDelivereData = async (req, res) => {
    let connection;
    try {
        const deliverId = req.user.id;
        console.log("id", deliverId);
        connection = await con.getConnection();
        const sql = `SELECT * FROM livreur WHERE id = ?`;
        const [results] = await connection.query(sql, [deliverId]);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Delivere non trouvé' });
        }
        console.log("delivere", results[0]);
        res.json({
            success: true,
            delivere: results[0]
        });
    } catch (err) {
        console.error('Erreur lors de la récupération des données du livreur:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    } finally {
        if (connection) connection.release();
    }
};

// get all deliveres
exports.getAllDeliveres = async (req, res) => {
    let connection;
    try {
  
        connection = await con.getConnection();
        
        // Requête pour obtenir le nombre total de magasins
        const [countResult] = await connection.query('SELECT COUNT(*) as total FROM livreur');
        const total = countResult[0].total;
  
        // Requête pour obtenir les magasins paginés
        const [deliveres] = await connection.query(
          `SELECT *
           FROM livreur
           ORDER BY id DESC`
      );
        res.json({
            success: true,
            deliveres,
            total
        });
        console.log("shop recuperer",deliveres);
  
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

exports.getAvailableDeliveres = async (req, res) => {
    let connection;
    try {
  
        connection = await con.getConnection();
        
        // Requête pour obtenir le nombre total de magasins
        const [countResult] = await connection.query("SELECT COUNT(*) as total FROM livreur WHERE disponibilite = 'true'");
        const total = countResult[0].total;
  
        // Requête pour obtenir les magasins paginés
        const [deliveres] = await connection.query(
          `SELECT *
           FROM livreur
           WHERE disponibilite = 'true' AND statut = 'verifier'
           ORDER BY id DESC`
      );
        res.json({
            success: true,
            deliveres,
            total
        });
        console.log("livreur disponible",deliveres);
  
    } catch (error) {
        console.error('Erreur récupération liste des livreurs disponible:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.updateDeliverStatus = async (req, res) => {
    let connection;
    try {
        const deliverId = req.params.id;
        const { status } = req.body;

       
        connection = await con.getConnection();
        await connection.beginTransaction();

        // Vérifier si le magasin existe
        const [deliver] = await connection.query(
            'SELECT id FROM livreur WHERE id = ?',
            [deliverId]
        );

        if (deliver.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'LIvreur non trouvé'
            });
        }

        // Mise à jour du statut
        const [result] = await connection.query(
            'UPDATE livreur SET statut = ? WHERE id = ?',
            [status, deliverId]
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
            message: 'Statut du livreur mis à jour',
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

}

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
    
            connection = await con.getConnection();
            const [users] = await connection.query(
                'SELECT * FROM livreur WHERE email = ? AND statut = "verifier"',
                [email]
            );
    
            if (users.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Votre compte n\'a pas encore été vérifié'
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
                { expiresIn: '24h' }
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

exports.getAvailableDeliveres = async (req, res) => {
    let connection;
    try {
        const { latitude, longitude } = req.query;
        console.log ('Evenement de recuperation de position', req.query);

        connection = await con.getConnection();
        await connection.beginTransaction();
         
      const [drivers] = await connection.query(`
        SELECT *,
          (6371 * acos(
            cos(radians(?)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians(?)) + 
            sin(radians(?)) * sin(radians(latitude))
          )) AS distance
        FROM livreur
        WHERE disponibilite = 'actif'
        ORDER BY distance
      `, [latitude, longitude, latitude]);

        const total = drivers.length;

        res.json({
            success: true,
            drivers,
            total
        });
        console.log("livreur disponible",drivers);
  
    } catch (error) {
        console.error('Erreur récupération liste des livreurs disponible:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
}


exports.updateDeliverLocation = async (req, res) => {
    let connection;
    try {
        const deliverId = req.user.id;
        const { latitude, longitude } = req.body;

        connection = await con.getConnection();
        await connection.beginTransaction();

        // Mise à jour de la position
        const [result] = await connection.query(
            'UPDATE livreur SET latitude = ?, longitude = ? WHERE id = ?',
            [latitude, longitude, deliverId]
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
            message: 'Position du livreur mise à jour'
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erreur mise à jour position:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
}

exports.updateDeliverAvailability = async (req, res) => {
    let connection;
    try {
        const deliverId = req.params.id;
        const { availability } = req.body;
        console.log(req.body, req.params.id);

        connection = await con.getConnection();
        await connection.beginTransaction();

        // Mise à jour de la disponibilité
        const [result] = await connection.query(
            'UPDATE livreur SET disponibilite = ? WHERE id = ?',
            [availability, deliverId]
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
            message: 'Disponibilité du livreur mise à jour',
            availability
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erreur mise à jour disponibilité:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
}


