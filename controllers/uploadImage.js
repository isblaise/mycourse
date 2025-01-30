const pool = require('../config/db');
const fs = require('fs');


exports.uploadImages = async (req, res) => {
  let connection;
  shopId = req.body.shopId;

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier envoyé'
      });
    }

    console.log(req.files);

    connection = await pool.getConnection();
    const savedImages = [];

    // Préparer la requête d'insertion
    const insertQuery = `
      INSERT INTO photos (name, data, content_type, size, shop_id)
      VALUES (?, ?, ?, ?, ?)
    `;

    // Traiter chaque fichier
    for (const file of req.files) {
      const base64Data = fs.readFileSync(file.path).toString('base64');

      const [result] = await connection.query(insertQuery, [
        file.originalname,
        base64Data,
        file.mimetype,
        file.size, 
        shopId
      ]);

      savedImages.push({
        id: result.insertId,
        name: file.originalname,
        contentType: file.mimetype,
        size: file.size
      });
    }

    return res.status(200).json({
      success: true,
      message: `${savedImages.length} images uploadées avec succès`,
      files: savedImages
    });

  } catch (error) {
    console.error('Erreur lors de l\'upload :', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de l\'upload des images.'
    });
  } finally {
    if (connection) connection.release();
  }
};


exports.getShopImages = async (req, res) => {
  let connection;
  const shopId = req.params.shopId; // ID du magasin passé dans les paramètres de l'URL

  try {
    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: "L'ID du magasin est requis.",
      });
    }

    connection = await pool.getConnection();

    // Récupérer les images du magasin
    const [images] = await connection.query(
      `
      SELECT * 
      FROM photos 
      WHERE shop_id = ?
      `,
      [shopId]
    );

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aucune image trouvée pour ce magasin.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `${images.length} image(s) trouvée(s).`,
      images,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des images :", error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la récupération des images.",
    });
  } finally {
    if (connection) connection.release();
  }
};
