const express = require('express');
const app = express();

const db = require('../config/db');

app.use(express.json());


exports.register = async (req, res) => {
    let connection;
    try {
        const { name, lng, lat, userId } = req.body;
        
        if (!name || !lng || !lat || !userId ) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tous les champs sont requis' 
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [existingPlace] = await connection.query(
            'SELECT id FROM favorite_place WHERE name = ? AND ABS(lng - ?) < 0.000001 AND ABS(lat - ?) < 0.000001', 
            [name, lng, lat]
        );

        console.log('existingPlace:', existingPlace);
        if (existingPlace.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: 'Cet endroit existe déjà'
            });
        }

       
        const [result] = await connection.query(
            'INSERT INTO favorite_place (name, lng, lat, userId) VALUES (?, ?, ?, ?)',
            [name, lng, lat, userId]
        );

        await connection.commit();
        res.status(201).json({
            success: true,
            message: 'Ajout réussie',
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erreur :', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
};
 
exports.getUserFavoritePlaces = async (req, res) => {
    let connection;
    try {
        const  userId  = req.params.userId;
        console.log('req.params:', req.params);
        console.log('userId:', userId);
        connection = await db.getConnection();
        const [places] = await connection.query(
            'SELECT * FROM favorite_place WHERE userId = ?',
            [userId]
        );
        console.log('places:', places);
        res.status(200).json({
            success: true,
            places
        });
    } catch (error) {
        console.error('Erreur :', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur'
        });
    } finally {
        if (connection) connection.release();
    }
}