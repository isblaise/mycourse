const express = require('express');
const app = express();
const fs = require('fs');
const fsPromises = require('fs').promises;
const createReadStream = require('fs').createReadStream;
const csv = require('csv-parser');
const path = require('path');
const db = require('../config/db');



app.use(express.json());


exports.addProduct = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        console.log("req.body:", req.body);
        const {
            shopId,
            rayon,
            stock, 
            securite,
            name,
            description,
            price,
            isSolde,
            newPrice,
            categorieId,
            photo
        } = req.body;

        if (!shopId || !rayon || !name || !price || !categorieId || !photo || !stock || !securite) {
            return res.status(400).json({
                success: false,
                message: 'Champs obligatoires manquants'
            });
        }

        if (isNaN(price) || (isSolde && isNaN(newPrice))) {
            return res.status(400).json({
                success: false,
                message: 'Prix invalides'
            });
        }

        const [existingProducts] = await connection.query(
            'SELECT id FROM products WHERE shop_id = ? AND name = ? AND rayon_id = ? AND categorie_id = ?',
            [shopId, name, rayon, categorieId]
        );

        if (existingProducts.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: 'Produit déjà existant'
            });
        }

        const [result] = await connection.query(
            `INSERT INTO products 
             (shop_id, rayon_id, name, description, price, photo_id, isSolde, newPrice,stock, securite, categorie_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?,?,?, ?)`,
            [shopId, rayon, name, description, price, photo, isSolde, newPrice,stock, securite, categorieId]
        );

        await connection.commit();
        res.status(201).json({
            success: true,
            message: 'Produit créé avec succès',
            productId: result.insertId
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erreur création produit:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.updateProduct = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const productId = req.params.id;
        const {
            rayon,
            name,
            description,
            price,
            isSolde,
            stock,
            securite,
            newPrice,
            categorieId, 
            photo
        } = req.body;

        const [product] = await connection.query(
            'SELECT * FROM products WHERE id = ?',
            [productId]
        );

        if (product.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Produit non trouvé'
            });
        }

        const [result] = await connection.query(
            `UPDATE products 
             SET rayon_id = ?, name = ?, description = ?, price = ?,
                 photo_id = ?, isSolde = ?, newPrice = ?, categorie_id = ?, stock = ?, securite = ?
             WHERE id = ?`,
            [rayon, name, description, price, photo, isSolde, newPrice, categorieId, stock, securite, productId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Mise à jour impossible'
            });
        }

        await connection.commit();
        res.json({
            success: true,
            message: 'Produit mis à jour',

        });

    } catch (error) {
        if (connection) await connection.rollback();
        if (req.file) {
            await fsPromises.unlink(req.file.path).catch(() => {});
        }
        console.error('Erreur mise à jour produit:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.deleteProduct = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [product] = await connection.query(
            'SELECT photo FROM products WHERE id = ?',
            [req.params.id]
        );

        if (product.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Produit non trouvé'
            });
        }

        await connection.query('DELETE FROM products WHERE id = ?', [req.params.id]);

        if (product[0].photo) {
            await fsPromises.unlink(
                path.join('uploads', product[0].photo)
            ).catch(() => {});
        }

        await connection.commit();
        res.json({
            success: true,
            message: 'Produit supprimé'
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erreur suppression produit:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.getProductById = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        const [products] = await connection.query(
            'SELECT * FROM products WHERE id = ?',
            [req.params.id]
        );

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Produit non trouvé'
            });
        }

        res.json({
            success: true,
            product: products[0]
        });

    } catch (error) {
        console.error('Erreur récupération produit:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};


// Obtenir tous les produits
exports.getAllProducts = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        const sql = `
       SELECT 
        p.*,
        s.store_name AS shopName,
        s.longitude AS shopLongitude,
        s.latitude AS shopLatitude,
        c.name AS categorieName,
        r.name AS rayonName,
        ph.data AS photoUrl,
        ph.name AS photoName
    FROM 
        products p
    LEFT JOIN 
        shop s ON p.shop_id = s.id
    LEFT JOIN 
        categories c ON p.categorie_id = c.id
    LEFT JOIN 
        rayon r ON p.rayon_id = r.id
    LEFT JOIN
        photos ph ON p.photo_id = ph.id
    WHERE 
        s.status = 'verifier'  
    ORDER BY 
        p.id DESC
    LIMIT 10;
    `;
        const [results] = await connection.query(sql);
        console.log("produits récupérés:", results)
        res.json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des produits :', err);
        res.status(500).json({ error: 'Erreur du serveur' });
    }
    finally {
        if (connection) connection.release();
    }
};
// Obtenir les produits par magasin et les classer par rayon
exports.getProductsByStore = async (req, res) => {
    let connection;
    try {
        const shopId = req.params.shopId;
        connection = await db.getConnection();

        const sql = `
           SELECT 
                p.*,
                c.name AS categorieName,
                r.name AS rayonName,
                ph.data AS photo_url,
                ph.id AS photo_id
            FROM 
                products p
            LEFT JOIN 
                categories c ON p.categorie_id = c.id
            LEFT JOIN 
                rayon r ON p.rayon_id = r.id
            LEFT JOIN
                photos ph ON p.photo_id = ph.id
            WHERE 
                p.shop_id = ?
            ORDER BY 
                r.name ASC, p.name ASC
        `;

        const [products] = await connection.query(sql, [shopId]);
        console.log("produit recuperer:", products)
        res.json(products);
    } catch (error) {
        console.error('Erreur récupération produits:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};


exports.uploadProductsByCsv = async (req, res) => {
    let connection;
    const filePath = req.file?.path;

    try {
        if (!req.file || !req.body.shopId) {
            return res.status(400).json({
                success: false,
                message: !req.file ? "Fichier CSV requis" : "shop_id requis"
            });
        }

        const products = [];
        await new Promise((resolve, reject) => {
            createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => {
                    if (data.nom && data.categorie && data.rayon && data.prix) {                  
                        products.push({
                            name: data.nom.trim(),
                            price: parseFloat(data.prix),
                            description: data.description?.trim() || '',
                            photo: data.photo,
                            shop_id: req.body.shopId,
                            category_name: data.categorie.trim(),
                            rayon_name: data.rayon.trim(),
                            isSolde: data.solde === 'true' || data.solde === '1',
                            stock: parseInt(data.stock) || 0,
                            securite: parseInt(data.securite) || 0,
                            newPrice: data.nouveau_prix ? parseFloat(data.nouveau_prix) : null
                        });
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (products.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Le fichier CSV ne contient aucun produit valide"
            });
        }
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Récupération des rayons disponibles
        const requestedRayons = [...new Set(products.map(p => p.rayon_name))];
        const [rayons] = await connection.query(
            "SELECT id, name FROM rayon WHERE shop_id = ? AND name IN (?)",
            [req.body.shopId, requestedRayons]
        );

        // Récupération des catégories disponibles
        const requestedCategories = [...new Set(products.map(p => p.category_name))];
        const [categories] = await connection.query(
            "SELECT id, name FROM categories WHERE shop_id = ? AND name IN (?)",
            [req.body.shopId, requestedCategories]
        );

        // Vérification des rayons et catégories manquants
        const availableRayons = new Set(rayons.map(r => r.name.toLowerCase()));
        const availableCategories = new Set(categories.map(c => c.name.toLowerCase()));
        
        const missingRayons = requestedRayons.filter(r => 
            !availableRayons.has(r.toLowerCase())
        );
        const missingCategories = requestedCategories.filter(c => 
            !availableCategories.has(c.toLowerCase())
        );

        if (missingRayons.length > 0 || missingCategories.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Impossible d'importer les produits : rayons ou catégories manquants",
                details: {
                    rayons_manquants: missingRayons.length > 0 ? missingRayons : null,
                    categories_manquantes: missingCategories.length > 0 ? missingCategories : null,
                    shop_id: req.body.shopId,
                    action_requise: "Veuillez créer les rayons et catégories manquants pour ce magasin avant d'importer les produits"
                }
            });
        }

        // Vérification des produits existants
        const productNames = products.map(p => p.name.toLowerCase());
        const [existingProducts] = await connection.query(
            "SELECT name FROM products WHERE shop_id = ? AND LOWER(name) IN (?)",
            [req.body.shopId, productNames]
        );

        const existingProductNames = new Set(existingProducts.map(p => p.name.toLowerCase()));
        const duplicateProducts = products.filter(p => 
            existingProductNames.has(p.name.toLowerCase())
        );

        if (duplicateProducts.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Certains produits existent déjà dans ce magasin",
                details: {
                    produits_existants: duplicateProducts.map(p => p.name),
                    shop_id: req.body.shopId
                }
            });
        }

        const rayonMap = new Map(rayons.map(r => [r.name.toLowerCase(), r.id]));
        const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

        // Préparation des produits valides pour l'insertion
        const validProducts = products.map(p => [
            p.shop_id,
            rayonMap.get(p.rayon_name.toLowerCase()),
            p.name,
            p.description,
            p.price,
            p.photo,
            p.isSolde,
            p.stock,
            p.securite,
            p.newPrice,
            categoryMap.get(p.category_name.toLowerCase())
        ]);

        // Insertion des produits
        await connection.query(
            `INSERT INTO products 
            (shop_id, rayon_id, name, description, price, photo_id, isSolde, stock, securite, newPrice, categorie_id) 
            VALUES ?`,
            [validProducts]
        );

        await connection.commit();

        res.json({
            success: true,
            message: "Import terminé avec succès",
            details: {
                nombre_produits_importes: validProducts.length,
                shop_id: req.body.shopId
            }
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Erreur:", error);
        res.status(500).json({
            success: false,
            message: "Une erreur est survenue lors de l'import",
            details: {
                erreur: error.message
            }
        });
    } finally {
        if (connection) connection.release();
        if (filePath) await fs.promises.unlink(filePath).catch(() => {});
    }
};
