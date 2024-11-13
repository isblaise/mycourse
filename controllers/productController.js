const express = require('express');
const app = express();
const con = require('../config/db'); // Assuming you have a database configuration file
app.use(express.json());


exports.addProduct = async (req, res) => {
    try {
        const { 
            shopId, 
            rayonId, 
            name, 
            description, 
            price, 
            photo,
            isSolde,
            newPrice,
            soldeDebut,
            soldeFin,
            categorieId 
        } = req.body;
  
        const checkSql = `SELECT * FROM products WHERE shop_id = ? AND name = ? AND rayon_id = ? AND categorie_id = ?`;
        const [checkResults] = await con.promise().query(checkSql, [shopId, name, rayonId, categorieId]);

        if (checkResults.length > 0) {
            return res.status(409).json({ error: 'Le produit existe déjà' });
        }

        const insertSql = `
            INSERT INTO products 
            (shop_id, rayon_id, name, description, price, photo, isSolde, newPrice, solde_debut, solde_fin, categorie_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [insertResults] = await con.promise().query(
            insertSql, 
            [shopId, rayonId, name, description, price, photo, isSolde, newPrice, soldeDebut, soldeFin, categorieId]
        );

        res.status(201).json({ 
            message: 'Produit créé avec succès',
            productId: insertResults.insertId 
        });
    } catch (err) {
        console.error('Erreur lors de l\'insertion :', err);
        res.status(500).json({ error: 'Erreur du serveur' });
    }
};

// Modifier un produit
exports.updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { 
            shopId, 
            rayonId, 
            name, 
            description, 
            price, 
            photo,
            isSolde,
            newPrice,
            soldeDebut,
            soldeFin,
            categorieId 
        } = req.body;

        // Vérifier si le produit existe
        const checkSql = `SELECT * FROM products WHERE id = ?`;
        const [checkResults] = await con.promise().query(checkSql, [productId]);

        if (checkResults.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        const updateSql = `
            UPDATE products 
            SET shop_id = ?,
                rayon_id = ?,
                name = ?,
                description = ?,
                price = ?,
                photo = ?,
                isSolde = ?,
                newPrice = ?,
                solde_debut = ?,
                solde_fin = ?,
                categorie_id = ?
            WHERE id = ?
        `;

        const [updateResults] = await con.promise().query(
            updateSql,
            [shopId, rayonId, name, description, price, photo, isSolde, newPrice, soldeDebut, soldeFin, categorieId, productId]
        );

        if (updateResults.affectedRows === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        res.json({ message: 'Produit mis à jour avec succès' });
    } catch (err) {
        console.error('Erreur lors de la mise à jour :', err);
        res.status(500).json({ error: 'Erreur du serveur' });
    }
};

// Supprimer un produit
exports.deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        // Vérifier si le produit existe
        const checkSql = `SELECT * FROM products WHERE id = ?`;
        const [checkResults] = await con.promise().query(checkSql, [productId]);

        if (checkResults.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        const deleteSql = `DELETE FROM products WHERE id = ?`;
        const [deleteResults] = await con.promise().query(deleteSql, [productId]);

        res.json({ message: 'Produit supprimé avec succès' });
    } catch (err) {
        console.error('Erreur lors de la suppression :', err);
        res.status(500).json({ error: 'Erreur du serveur' });
    }
};

// Obtenir un produit par ID
exports.getProductById = async (req, res) => {
    try {
        const productId = req.params.id;
        const sql = `SELECT * FROM products WHERE id = ?`;
        const [results] = await con.promise().query(sql, [productId]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        res.json(results[0]);
    } catch (err) {
        console.error('Erreur lors de la récupération du produit :', err);
        res.status(500).json({ error: 'Erreur du serveur' });
    }
};

// Obtenir tous les produits
exports.getAllProducts = async (req, res) => {
    try {
        const sql = `SELECT * FROM products`;
        const [results] = await con.promise().query(sql);

        res.json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des produits :', err);
        res.status(500).json({ error: 'Erreur du serveur' });
    }
};

// Obtenir les produits par magasin
exports.getProductsByShop = async (req, res) => {
    try {
        const shopId = req.params.shopId;
        
        const sql = `SELECT * FROM products WHERE shop_id = ?`;
        const [results] = await con.promise().query(sql, [shopId]);

        res.json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des produits :', err);
        res.status(500).json({ error: 'Erreur du serveur' });
    }
};