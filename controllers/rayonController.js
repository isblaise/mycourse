const express = require('express');
const app = express();
const fs = require("fs");
const csvParser = require("csv-parser");
const promisePool = require('../config/db'); // Assuming you have a database configuration file

app.use(express.json());


exports.addRayon = async (req, res) => {
    try {
        const { shopId: shop_id, name } = req.body;

        // Vérification si le rayon existe déjà
        const [existingRayons] = await promisePool.query(
            'SELECT * FROM rayon WHERE shop_id = ? AND name = ?',
            [shop_id, name]
        );

        if (existingRayons.length > 0) {
            return res.status(409).json({ error: 'Le rayon existe déjà' });
        }

        // Insertion du nouveau rayon
        await promisePool.query(
            'INSERT INTO rayon (shop_id, name) VALUES (?, ?)',
            [shop_id, name]
        );

        res.status(201).json({ message: 'Rayon créé avec succès' });
    } catch (error) {
        res.status(500).json({ 
            error: 'Erreur lors de l\'ajout du rayon',
            details: error.message 
        });
    }
    finally {
    }
};

exports.updateRayon = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        // Vérification si le rayon existe
        const [rayon] = await promisePool.query(
            'SELECT * FROM rayon WHERE id = ?',
            [id]
        );

        if (rayon.length === 0) {
            return res.status(404).json({ error: 'Rayon non trouvé' });
        }

        // Mise à jour du rayon
        await promisePool.query(
            'UPDATE rayon SET name = ? WHERE id = ?',
            [name, id]
        );

        res.status(200).json({ message: 'Rayon mis à jour avec succès' });
    } catch (error) {
        res.status(500).json({
            error: 'Erreur lors de la mise à jour du rayon',
            details: error.message
        });
    }
    finally {
      
    }
};

exports.deleteRayon = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await promisePool.query(
            'DELETE FROM rayon WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Rayon non trouvé' });
        }

        res.status(200).json({ message: 'Rayon supprimé avec succès' });
    } catch (error) {
        res.status(500).json({
            error: 'Erreur lors de la suppression du rayon',
            details: error.message
        });
    }
    finally {
       
    }
};

exports.getRayonByShopId = async (req, res) => {
    try {
        const { magasinId } = req.params;
        
        const [rayons] = await promisePool.query(
            'SELECT * FROM rayon WHERE shop_id = ?',
            [magasinId]
        );

        res.json(rayons);
    } catch (error) {
        console.error('Erreur dans la requête MySQL:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des rayons',
            details: error.message
        });
    }
   
};

exports.uploadRayonByCsv = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Veuillez fournir un fichier CSV !" });
    }

    const shop_id = req.body.shopId;
    if (!shop_id) {
        return res.status(400).json({ message: "shop_id est requis !" });
    }

    const filePath = req.file.path;
    const rayons = [];

    try {
        // Lecture du fichier CSV
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath, { encoding: 'utf-8' })
                 .pipe(csvParser())
                .on("data", (data) => {
                    console.log(data.nom);
                    if (data.nom) {
                        rayons.push(data.nom.trim());
                    }
                })
                .on("end", resolve)
                .on("error", reject);
        });
        console.log(rayons);

        if (rayons.length === 0) {
            return res.status(400).json({ message: "Aucun rayon valide trouvé dans le fichier !" });
        }

        // Récupération des rayons existants
        const [existingRayons] = await promisePool.query(
            "SELECT name FROM rayon WHERE shop_id = ?",
            [shop_id]
        );

        const existingNames = new Set(existingRayons.map(row => row.name));
        const uniqueRayons = rayons.filter(name => !existingNames.has(name));

        if (uniqueRayons.length === 0) {
            return res.status(200).json({ message: "Tous les rayons du fichier existent déjà dans la base." });
        }

        // Insertion des nouveaux rayons
        const rayonsToInsert = uniqueRayons.map(name => [shop_id, name]);
        await promisePool.query(
            "INSERT INTO rayon (shop_id, name) VALUES ?",
            [rayonsToInsert]
        );

        res.status(200).json({
            message: `${rayonsToInsert.length} nouveau(x) rayon(s) importé(s) avec succès !`,
            ajoutés: uniqueRayons.length,
            doublonsIgnorés: rayons.length - uniqueRayons.length
        });

    } catch (error) {
        console.error("Erreur lors du traitement :", error);
        res.status(500).json({ 
            message: "Erreur lors de l'importation des rayons.",
            details: error.message 
        });
    } finally {
        // Suppression du fichier temporaire
        fs.unlink(filePath, (err) => {
            if (err) console.error("Erreur lors de la suppression du fichier :", err);
        });
    }
};

