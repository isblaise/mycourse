const express = require('express');
const app = express();
const fs = require("fs");
const csvParser = require("csv-parser");
const promisePool = require('../config/db');

app.use(express.json());

exports.addCategorie = async (req, res) => {
    try {
        const { shopId: shop_id, name, rayonId: rayon_id } = req.body;

        // Vérification si la catégorie existe déjà
        const [existingCategories] = await promisePool.query(
            'SELECT * FROM categories WHERE shop_id = ? AND name = ? AND rayon_id = ?',
            [shop_id, name, rayon_id]
        );

        if (existingCategories.length > 0) {
            return res.status(409).json({ error: 'Cette catégorie existe déjà dans ce rayon' });
        }

        // Insertion de la nouvelle catégorie
        await promisePool.query(
            'INSERT INTO categories (shop_id, rayon_id, name) VALUES (?, ?, ?)',
            [shop_id, rayon_id, name]
        );

        res.status(201).json({ message: 'Catégorie créée avec succès' });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ 
            error: 'Erreur lors de l\'ajout de la catégorie',
            details: error.message 
        });
    }
};

exports.updateCategorie = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, rayon_id } = req.body;

        const [result] = await promisePool.query(
            'UPDATE categories SET name = ?, rayon_id = ? WHERE id = ?',
            [name, rayon_id, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }

        res.status(200).json({ message: 'Catégorie mise à jour avec succès' });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la mise à jour de la catégorie',
            details: error.message 
        });
    }
    
};

exports.getCategorieByShopId = async (req, res) => {
    try {
        const { magasinId } = req.params;
        const [categories] = await promisePool.query(
            `SELECT categories.*, rayon.name AS rayon_name 
             FROM categories 
             JOIN rayon ON categories.rayon_id = rayon.id 
             WHERE categories.shop_id = ?`,
            [magasinId]
        );

        res.json(categories);
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des catégories',
            details: error.message
        });
    }
  }

exports.getCategorieByRayonId = async (req, res) => {
    try {
        const { rayonId } = req.params;
        const [categories] = await promisePool.query(
            'SELECT * FROM categories WHERE rayon_id = ?',
            [rayonId]
        );

        res.json(categories);
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des catégories',
            details: error.message
        });
    }
   
};

exports.deleteCategories = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await promisePool.query(
            'DELETE FROM categories WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }

        res.status(200).json({ message: 'Catégorie supprimée avec succès' });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({
            error: 'Erreur lors de la suppression de la catégorie',
            details: error.message
        });
    }
  
};

exports.uploadCategoriesByCsv = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Veuillez fournir un fichier CSV !" });
    }

    const shop_id = req.body.shopId;
    if (!shop_id) {
        return res.status(400).json({ message: "shop_id est requis !" });
    }

    const filePath = req.file.path;
    const categories = [];

    try {
        // Lecture du fichier CSV
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath, { encoding: "utf-8" })
                .pipe(csvParser({ separator: ";" }))
                .on("data", (data) => {
                    console.log("categorie",data);
                    if (data.nom && data.rayon) {
                        categories.push({
                            name: data.nom.trim(),
                            shop_id,
                            rayon_name: data.rayon.trim(),
                        });
                    }
                })
                .on("end", resolve)
                .on("error", reject);
        });

        if (categories.length === 0) {
            return res.status(400).json({ message: "Aucune catégorie valide trouvée dans le fichier !" });
        }

        // Récupération des rayons existants
        const rayonNames = categories.map(cat => cat.rayon_name);
        const [rayonResults] = await promisePool.query(
            "SELECT id, name FROM rayon WHERE shop_id = ? AND name IN (?)",
            [shop_id, rayonNames]
        );

        const rayonMap = new Map(rayonResults.map(r => [r.name, r.id]));

        // Filtrer les catégories valides
        const validCategories = categories
            .filter(cat => rayonMap.has(cat.rayon_name))
            .map(cat => [cat.name, shop_id, rayonMap.get(cat.rayon_name)]);

        if (validCategories.length === 0) {
            return res.status(400).json({
                message: "Aucune catégorie avec des rayons valides trouvée dans le fichier !"
            });
        }

        // Vérification des doublons
        const categoryPairs = validCategories.map(([name, _, rayon_id]) => [name, rayon_id]);
        const [existingCategories] = await promisePool.query(
            "SELECT name, rayon_id FROM categories WHERE shop_id = ? AND (name, rayon_id) IN (?)",
            [shop_id, categoryPairs]
        );

        const existingSet = new Set(
            existingCategories.map(cat => `${cat.name.toLowerCase()}-${cat.rayon_id}`)
        );

        // Filtrer les nouvelles catégories
        const newCategories = validCategories.filter(
            ([name, _, rayon_id]) => !existingSet.has(`${name.toLowerCase()}-${rayon_id}`)
        );

        if (newCategories.length === 0) {
            return res.status(200).json({
                message: "Toutes les catégories étaient déjà présentes dans la base."
            });
        }

        // Insertion des nouvelles catégories
        await promisePool.query(
            "INSERT INTO categories (name, shop_id, rayon_id) VALUES ?",
            [newCategories]
        );

        res.status(200).json({
            message: `${newCategories.length} nouvelle(s) catégorie(s) importée(s) avec succès !`,
            totalAttempted: validCategories.length,
            duplicatesSkipped: validCategories.length - newCategories.length
        });

    } catch (error) {
        console.error("Erreur lors du traitement :", error);
        res.status(500).json({ 
            message: "Erreur lors de l'importation des catégories",
            details: error.message 
        });
    } finally {
        fs.unlink(filePath, (err) => {
            if (err) console.error("Erreur lors de la suppression du fichier :", err);
        });
       
      
    }
};