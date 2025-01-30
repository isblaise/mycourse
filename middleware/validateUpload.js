// middleware/validateUpload.js
const AdmZip = require('adm-zip');
const path = require('path');

exports.validateZipContent = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier ZIP fourni' });
        }

        const zip = new AdmZip(req.file.path);
        const zipEntries = zip.getEntries();

        // Vérifier la présence du CSV
        const csvEntry = zipEntries.find(entry => entry.entryName.endsWith('.csv'));
        if (!csvEntry) {
            return res.status(400).json({ error: 'Le fichier ZIP doit contenir un fichier CSV' });
        }

        // Vérifier les images
        const imageEntries = zipEntries.filter(entry => 
            /\.(jpg|jpeg|png|webp)$/i.test(entry.entryName)
        );

        if (imageEntries.length === 0) {
            return res.status(400).json({ error: 'Le fichier ZIP doit contenir au moins une image' });
        }

        // Ajouter les informations validées à la requête
        req.zipValidation = {
            csvEntry,
            imageEntries,
            zip
        };

        next();
    } catch (err) {
        return res.status(400).json({ error: 'Erreur lors de la validation du ZIP' });
    }
};