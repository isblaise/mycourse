const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');  
const con = require('../config/db'); // Assuming you have a database configuration file


// add shop 

    exports.registerStore = async (req, res) => {
    const { name, email, password, phone, store_name, adresse } = req.body;
    const profilePhoto = req.files['profilePhoto'][0].filename; // Nom du fichier de la photo de profil
    const documentPhoto = req.files['documentPhoto'][0].filename; // Nom du fichier du document d'identité
  
    try {
      // Vérifier si un utilisateur avec cet email existe déjà
      const userCheckQuery = `SELECT * FROM shop WHERE email = ?`;
      const [existingUser] = await con.promise().query(userCheckQuery, [email]);
  
      if (existingUser.length > 0) {
        return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const sql = "INSERT INTO shop (name, phone, store_name, adresse, email, password, logo, doc) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      await con.promise().query(sql, [name, phone, store_name, adresse, email, hashedPassword, profilePhoto, documentPhoto]);
  
      res.status(201).send("Utilisateur enregistré avec succès");
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
  };

    exports.loginStore = async (req, res) => {
        try {
            const { email, password } = req.body;
            const sql = `SELECT * FROM shop WHERE email = ?`;
            const [results] = await con.promise().query(sql, [email]);

            if (results.length === 0) {
                return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
            }
            const shop = results[0];
            const isMatch = await bcrypt.compare(password, shop.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
            }
            const token = jwt.sign({ id: shop.id, email: shop.email }, 'secret_key', { expiresIn: '1h' });
            res.status(200).json({ message: 'Connexion réussie', token });
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            res.status(500).json({ error: 'Erreur du serveur', details: error.message });
        }
    };

// get shop data 

  
    exports.getShopData = async (req, res) => {
    const userId = req.user.id; // ID extrait du token JWT
  
    const sql = `SELECT * FROM shop WHERE id = ?`;
    con.query(sql, [userId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
      res.status(200).json(results[0]); // Retourne les informations de l'utilisateur avec le code de statut 200
    });
  };
  
  
  // get all shop 
 
    exports.getShopList = async (req, res) => {
    const query = 'SELECT * FROM shop';
  
    con.query(query, (err, results) => {
      if (err) {
        console.error('Erreur dans la requête MySQL:', err);
        return res.status(500).json({ error: 'Erreur du serveur' });
      }
  
      if (!results || results.length === 0) {
        return res.status(404).json({ message: 'Aucun magasin trouvé' });
      }
  
      res.status(200).json(results);
    });
  };
  

// get latest shop 
 
    exports.getLatestShops = async (req, res) => {
    const query = 'SELECT * FROM shop ORDER BY id DESC LIMIT 2';
  
    con.query(query, (err, results) => {
      if (err) {
        console.error('Erreur dans la requête MySQL:', err);
        return res.status(500).json({ error: 'Erreur du serveur' });
      }
  
      if (!results || results.length === 0) {
        return res.status(404).json({ message: 'Aucun magasin récent trouvé' });
      }
  
      res.status(200).json(results);
    });
  };
  