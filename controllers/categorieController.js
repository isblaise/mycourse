const express = require('express');
const app = express();
const con = require('../config/db'); // Assuming you have a database configuration file

app.use(express.json());

exports.addCategorie = async (req, res) => {
        try {
            const { shopId: shop_id, name, rayonId : rayon_id } = req.body; // Assurez-vous que le nom correspond à votre front-end
    
            // Vérification si le rayon existe déjà
            const checkSql = `SELECT * FROM categories WHERE shop_id = ? AND name = ? AND rayon_id = ?`;
            const results = await new Promise((resolve, reject) => {
                con.query(checkSql, [shop_id, name, rayon_id], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });
            if (results.length > 0) {
                return res.status(409).json({ error: 'Cette categorie existe déjà dans cet rayon' });
            }
            const insertSql = `INSERT INTO categories (shop_id, rayon_id, name) VALUES (?, ?, ?)`;
            const insertResult = await new Promise((resolve, reject) => {
                con.query(insertSql, [shop_id, rayon_id, name], (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            res.status(201).json({
                message: 'Categorie créé'});
        } catch (error) {
          console.log(error.message)
            res.status(500).json({ 
                error: 'Erreur lors de l\'ajout de la categorie',
                details: error.message 
            });
        }
    };

    // a tester
    
    exports.updateCategorie = async (req, res) => {
      const { id } = req.params; // ID extrait du token JWT
        const { name, rayon_id} = req.body;
        try {
          const updateUserQuery = `
            UPDATE categories 
            SET name = ?, rayon_id = ? WHERE id = ?
          `;
          const [result] = await con.promise().query(updateUserQuery, [name, rayon_id, id]);
          if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Veuillez vous connecter' });
          }
      
          res.status(200).json({ message: 'categorie mises à jour' });
        } catch (error) {
          console.error('Erreur lors de la mise à jour :', error);
          res.status(500).json({ error: 'Erreur interne du serveur' });
        }
      };
    

    exports.getCategorieByShopId = async (req, res) => {
    const magasinId = req.params.magasinId;
    const query = `
     SELECT categories.*, rayon.name AS rayon_name 
    FROM categories 
    JOIN rayon ON categories.rayon_id = rayon.id 
    WHERE categories.shop_id = ?
  `;
    con.query(query, [magasinId], (err, result) => {
      if (err) {
        console.error('Erreur dans la requête MySQL:', err);
        res.status(500).send('Erreur du serveur');
        return;
      }
      console.log('Données récupérées:', result);  
      res.json(result);
    });
  };


  exports.getCategorieByRayonId = async (req, res) => {
    try {
      const rayonId = req.params.rayonId;
      const query = 'SELECT * FROM categories WHERE rayon_id = ?';
      
      con.query(query, [rayonId], (err, result) => {
        if (err) {
          throw err; // Lancer une erreur pour le bloc catch
        }
        console.log('Categorie par rayon:', result);  
        res.json(result);
      });
    } catch (error) {
      console.error('Erreur dans la requête:', error);
      res.status(500).json({
        error: 'Erreur lors de la récupération des catégories',
        details: error.message
      });
    }
  };
  
  exports.deleteCategories = async (req, res) => {
    try {
        const id = req.params.id;
        const deleteSql = 'DELETE FROM categories WHERE id = ?';
        
        await new Promise((resolve, reject) => {
            con.query(deleteSql, [id], (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        });

      res.status(200).json({ message: 'categorie supprimé avec succès' });
    } catch (error) {
        res.status(500).json({
            error: 'Erreur lors de la suppression de la categorie',
            details: error.message
        });
    }
};