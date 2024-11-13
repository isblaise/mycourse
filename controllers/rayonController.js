const express = require('express');
const app = express();
const con = require('../config/db'); // Assuming you have a database configuration file

app.use(express.json());

exports.addRayon = async (req, res) => {
        try {
            const { shopId: shop_id, name } = req.body; // Assurez-vous que le nom correspond à votre front-end
    
            // Vérification si le rayon existe déjà
            const checkSql = `SELECT * FROM rayon WHERE shop_id = ? AND name = ?`;
            const results = await new Promise((resolve, reject) => {
                con.query(checkSql, [shop_id, name], (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });
            if (results.length > 0) {
                return res.status(409).json({ error: 'Le rayon existe déjà' });
            }
            const insertSql = `INSERT INTO rayon (shop_id, name) VALUES (?, ?)`;
            const insertResult = await new Promise((resolve, reject) => {
                con.query(insertSql, [shop_id, name], (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            res.status(201).json({
                message: 'Rayon créé avec succès'});
        } catch (error) {
            res.status(500).json({ 
                error: 'Erreur lors de l\'ajout du rayon',
                details: error.message 
            });
        }
    };

    exports.updateRayon = async (req, res) => {
      try {
          const { id } = req.params; // ID du rayon à mettre à jour (passé en paramètre d'URL)
          const { name } = req.body; // Données envoyées dans le corps de la requête
  
          // Vérification si le rayon existe
          const checkSql = `SELECT * FROM rayon WHERE id = ?`;
          const rayon = await new Promise((resolve, reject) => {
              con.query(checkSql, [id], (err, results) => {
                  if (err) reject(err);
                  else resolve(results);
              });
          });
  
          if (rayon.length === 0) {
              return res.status(404).json({ error: 'Rayon non trouvé' });
          }
  
          // Mettre à jour le rayon
          const updateSql = `UPDATE rayon SET name = ? WHERE id = ?`;
          await new Promise((resolve, reject) => {
              con.query(updateSql, [name, id], (err, result) => {
                  if (err) reject(err);
                  else resolve(result);
              });
          });
  
          res.status(200).json({ message: 'Rayon mis à jour avec succès' });
      } catch (error) {
          res.status(500).json({
              error: 'Erreur lors de la mise à jour du rayon',
              details: error.message
          });
      }
  };

  exports.deleteRayon = async (req, res) => {
    try {
        const id = req.params.id;
        const deleteSql = 'DELETE FROM rayon WHERE id = ?';
        
        await new Promise((resolve, reject) => {
            con.query(deleteSql, [id], (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        });

        res.status(200).json({ message: 'Rayon supprimé avec succès' });
    } catch (error) {
        res.status(500).json({
            error: 'Erreur lors de la suppression du rayon',
            details: error.message
        });
    }
};


    exports.getRayonByShopId = async (req, res) => {
    const magasinId = req.params.magasinId;
    const query = 'SELECT * FROM rayon WHERE shop_id = ?';
  
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