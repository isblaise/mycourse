const con = require('../config/db'); 
const bcrypt = require('bcryptjs');


// create  delivere account
exports.createDelivereAccount = async (req, res) => {
    try {
        const { name, email, password, phone, adresse, age, type, modele, statut, disponibilite } = req.body;
        const profilPhoto = req.files['profilPhoto'][0].filename;
        const cnibPhoto = req.files['cnibPhoto'][0].filename;
        const cartegrisePhoto = req.files['cartegrisePhoto'][0].filename;
        const enginPhoto = req.files['enginPhoto'][0].filename;

        // Vérifier si un livreur existe déjà avec la même adresse email
        const checkEmailQuery = `SELECT * FROM livreur WHERE email = ?`;
        const [existingLivreur] = await con.promise().query(checkEmailQuery, [email]);

        if (existingLivreur.length > 0) {
            return res.status(409).json({ error: 'Un livreur avec cette adresse email existe déjà' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO livreur (name, email, password, phone, adresse, age, photo, type, modele, cnib, statut, carte_grise, engin, disponibilite) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await con.promise().query(sql, [name, email, hashedPassword, phone, adresse, age, profilPhoto, type, modele, cnibPhoto, statut, cartegrisePhoto, enginPhoto, disponibilite]);

        res.status(201).json({ message: 'Compte livreur créé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la création du compte livreur:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la création du compte' });
    }
};

// get delivere data
exports.getDelivereData = async (req, res) => {
    const userId = req.user.id; // ID extrait du token JWT
    const sql = `SELECT * FROM deliveres WHERE id = ?`;
    con.query(sql, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Delivere non trouvé' });
        }
        res.json(results[0]); // Retourne les informations du delivere                          
    });
};

