const pool = require('../config/db'); // Assuming you have a database configuration file


exports.getUserOrders = async (req, res) => {
    const users_id = req.params.users_id; // Récupération de l'ID utilisateur depuis l'URL
    const connection = await pool.getConnection();
    
    try {
        // Récupération des commandes de l'utilisateur
        const [orders] = await connection.query(
            `SELECT *
             FROM orders 
             WHERE users_id = ?
             ORDER BY created_at DESC`,
            [users_id]
        );

        
        if (orders.length === 0) {
            return res.json({
                success: true,
                message: "Aucune commande trouvée pour cet utilisateur",
                orders: []
            });
        }

        const ordersWithProducts = await Promise.all(orders.map(async (order) => {
            const [products] = await connection.query(
                `SELECT op.id, op.name, op.price, op.rayon_id, 
                        op.categorie_id, op.nb, op.shop_id
                 FROM order_products op
                 WHERE op.orders_id = ?`,
                [order.id]
            );

            return {
                ...order,
                products: products
            };
        }));
console.log(ordersWithProducts);
        res.json({
            success: true,
            message: "Commandes récupérées avec succès",
            orders: ordersWithProducts
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des commandes:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des commandes",
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.getDeliverOrders = async (req, res) => {
    const deliver_id = req.params.deliverId;
    const connection = await pool.getConnection();
    
    try {
        // Utilisation de DATE(created_at) pour comparer uniquement les dates
        const [orders] = await connection.query(
            `SELECT *
             FROM orders 
             WHERE livreur_id = ?
             AND DATE(created_at) = CURDATE()
             ORDER BY created_at DESC`,
            [deliver_id]
        );

        if (orders.length === 0) {
            return res.json({
                success: true,
                message: "Aucune commande du jour trouvée pour cet utilisateur",
                orders: []
            });
        }

        const ordersWithProducts = await Promise.all(orders.map(async (order) => {
            const [products] = await connection.query(
                `SELECT 
                    op.id, op.name, op.price, op.rayon_id, 
                    op.categorie_id, op.nb, op.shop_id, op.photo_id,
                    u.id AS user_id ,u.phone AS user_phone, u.name AS user_name, u.email AS user_email, 
                    r.id AS rayon_id, r.name AS rayon_name,
                    c.id AS categorie_id, c.name AS categorie_name,
                    pp.id AS photo_id, pp.data AS product_image,
                    s.id AS shop_id ,s.phone AS shop_phone, s.store_name AS shop_name, s.adresse AS shop_address, s.longitude AS shop_longitude, s.latitude AS shop_latitude,
                    s.logo AS shop_logo
                FROM order_products op
                JOIN orders o ON op.orders_id = o.id
                JOIN users u ON o.users_id = u.id
                JOIN shop s ON op.shop_id = s.id
                JOIN rayon r ON op.rayon_id = r.id
JOIN categories c ON op.categorie_id = c.id
LEFT JOIN photos pp ON op.photo_id = pp.id 
                WHERE op.orders_id = ?`,
                [order.id]
            );

            return {
                ...order,
                products: products
            };
        }));

        console.log('Commandes du jour :', ordersWithProducts);
        
        res.json({
            success: true,
            message: "Commandes du jour récupérées avec succès",
            orders: ordersWithProducts
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des commandes du jour:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des commandes du jour",
            error: error.message
        });
    } finally {
        connection.release();
    }
};


exports.getShopOrders = async (req, res) => {
    let connection;
    try {
        const shopId = req.params.shopId;
        connection = await pool.getConnection();

        // Récupération des commandes
        const sql = `
            SELECT 
                o.*,
                u.name as user_name,
                u.email as user_email,
                u.phone as user_phone,
                op.id as product_order_id,
                op.name as product_name,
                op.price as product_price,
                op.nb as product_quantity,
                op.rayon_id,
                op.categorie_id,
                r.name as rayon_name,
                c.name as category_name,
                ph.data as photo_url,
                ph.id as photo_id
            FROM 
                orders o
            LEFT JOIN 
                users u ON o.users_id = u.id
            LEFT JOIN 
                order_products op ON o.id = op.orders_id
            LEFT JOIN 
                rayon r ON op.rayon_id = r.id
            LEFT JOIN 
                categories c ON op.categorie_id = c.id
            LEFT JOIN 
                photos ph ON op.photo_id = ph.id
            WHERE 
                o.shop_id = ?
            ORDER BY 
                o.created_at DESC, o.id
        `;

        const [results] = await connection.query(sql, [shopId]);

        // Restructurer les données pour regrouper les produits par commande
        const orders = results.reduce((acc, row) => {
            if (!acc[row.id]) {
                // Créer une nouvelle commande
                acc[row.id] = {
                    id: row.id,
                    ref: row.ref,
                    total: row.total,
                    code_retrait: row.code_retrait,
                    delivery_adresse: row.delivery_adresse,
                    livraison: row.livraison,
                    status: row.status,
                    created_at: row.created_at,
                    served_at: row.served_at,
                    user: {
                        id: row.users_id,
                        name: row.user_name,
                        email: row.user_email,
                        phone: row.user_phone
                    },
                    products: []
                };
            }

            // Ajouter le produit à la commande
            if (row.product_order_id) {
                acc[row.id].products.push({
                    id: row.product_order_id,
                    name: row.product_name,
                    price: row.product_price,
                    quantity: row.product_quantity,
                    rayon: {
                        id: row.rayon_id,
                        name: row.rayon_name
                    },
                    category: {
                        id: row.categorie_id,
                        name: row.category_name
                    },
                    photo: {
                        id: row.photo_id,
                        url: row.photo_url
                    }
                });
            }

            return acc;
        }, {});

        // Convertir l'objet en tableau
        const formattedOrders = Object.values(orders);
        console.log(formattedOrders);
        res.json( formattedOrders);

    } catch (error) {
        console.error('Erreur lors de la récupération des commandes:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la récupération des commandes'
        });
    } finally {
        if (connection) connection.release();
    }
};



exports.getOrderById = async (req, res) => {
    const orderId = req.params.orderId;
    const connection = await pool.getConnection();
    
    try {
    
        const [orders] = await connection.query(
            `SELECT o.id, o.ref, o.users_id, o.total, o.code_retrait, 
                    o.adresse, o.livraison, o.shop_id, o.created_at
             FROM orders o
             WHERE o.id = ?`,
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Commande non trouvée"
            });
        }

        
        const [products] = await connection.query(
            `SELECT op.id, op.name, op.price, op.rayon_id, 
                    op.categorie_id, op.nb, op.shop_id
             FROM order_products op
             WHERE op.orders_id = ?`,
            [orderId]
        );

        const orderWithProducts = {
            ...orders[0],
            products: products
        };

        res.json({
            success: true,
            message: "Commande récupérée avec succès",
            order: orderWithProducts
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de la commande:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération de la commande",
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.getAllOrders = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        // Récupération de toutes les commandes
        const [orders] = await connection.query(
            `SELECT o.id, o.ref, o.users_id, o.total, o.code_retrait, 
                    o.adresse, o.livraison, o.shop_id, o.created_at,
                    u.name as user_name,  // Supposons que vous ayez une table users avec un champ name
                    s.name as shop_name   // Supposons que vous ayez une table shops avec un champ name
             FROM orders o
             LEFT JOIN users u ON o.users_id = u.id
             LEFT JOIN shops s ON o.shop_id = s.id
             ORDER BY o.created_at DESC`
        );

        // Si aucune commande n'existe
        if (orders.length === 0) {
            return res.json({
                success: true,
                message: "Aucune commande trouvée",
                orders: []
            });
        }

        // Récupération des produits pour chaque commande
        const ordersWithProducts = await Promise.all(orders.map(async (order) => {
            const [products] = await connection.query(
                `SELECT op.id, op.name, op.price, op.rayon_id, 
                        op.categorie_id, op.nb, op.shop_id,
                        r.name as rayon_name,     // Supposons que vous ayez une table rayons
                        c.name as category_name   // Supposons que vous ayez une table categories
                 FROM order_products op
                 LEFT JOIN rayons r ON op.rayon_id = r.id
                 LEFT JOIN categories c ON op.categorie_id = c.id
                 WHERE op.orders_id = ?`,
                [order.id]
            );

            // Calcul du nombre total de produits dans la commande
            const totalProducts = products.reduce((sum, product) => sum + product.nb, 0);

            return {
                ...order,
                total_products: totalProducts,
                products: products
            };
        }));

        // Calculs statistiques basiques
        const totalOrders = ordersWithProducts.length;
        const totalRevenue = ordersWithProducts.reduce((sum, order) => sum + order.total, 0);
        const averageOrderValue = totalRevenue / totalOrders;

        res.json({
            success: true,
            message: "Commandes récupérées avec succès",
            statistics: {
                total_orders: totalOrders,
                total_revenue: totalRevenue,
                average_order_value: averageOrderValue
            },
            orders: ordersWithProducts
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des commandes:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des commandes",
            error: error.message
        });
    } finally {
        connection.release();
    }
};


exports.serveOrder = async (req, res) => {
    const orderId = req.params.orderId;
    let connection;
    
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Vérifier si la commande existe et n'est pas déjà servie
        const [orderCheck] = await connection.query(
            `SELECT o.status, o.shop_id, o.ref 
             FROM orders o 
             WHERE o.id = ?`,
            [orderId]
        );

        if (orderCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Commande non trouvée"
            });
        }

        if (orderCheck[0].status === 'accepted') {
            return res.status(400).json({
                success: false,
                message: "Cette commande a déjà été servie"
            });
        }

        // 2. Récupérer les produits de la commande avec leurs stocks actuels
        const [orderProducts] = await connection.query(
            `SELECT 
                op.id, 
                op.nb as quantity, 
                p.id as product_id,
                p.stock as available_stock,
                p.securite as security_stock, 
                p.name,
                p.shop_id
             FROM order_products op
             JOIN products p ON op.product_id = p.id
             WHERE op.orders_id = ?`,
            [orderId]
        );

        // 3. Vérifications des stocks et du seuil de sécurité
        const stockIssues = orderProducts.map(product => {
            if (product.available_stock < product.quantity) {
                return {
                    name: product.name,
                    requested: product.quantity,
                    available: product.available_stock,
                    issue: 'stock_insufficient'
                };
            }
            // Vérifier si on passe sous le seuil de sécurité
            if ((product.available_stock - product.quantity) < product.security_stock) {
                return {
                    name: product.name,
                    currentStock: product.available_stock,
                    securityThreshold: product.security_stock,
                    issue: 'security_threshold'
                };
            }
            return null;
        }).filter(Boolean);

        // S'il y a des problèmes de stock insuffisant
        const criticalIssues = stockIssues.filter(issue => issue.issue === 'stock_insufficient');
        if (criticalIssues.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Stock insuffisant pour certains produits",
                insufficientProducts: criticalIssues
            });
        }

        // 4. Mettre à jour les stocks
        for (const product of orderProducts) {
            await connection.query(
                `UPDATE products 
                 SET stock = stock - ?
                 WHERE id = ? AND shop_id = ?`,
                [product.quantity, product.product_id, orderCheck[0].shop_id]
            );
        }

        // 5. Mettre à jour le statut de la commande
        await connection.query(
            `UPDATE orders 
             SET status = 'accepted',
                 served_at = NOW()
             WHERE id = ?`,
            [orderId]
        );

        await connection.commit();

        // 6. Préparer la réponse avec les avertissements éventuels
        const response = {
            success: true,
            message: "Commande servie avec succès",
            reference: orderCheck[0].ref
        };

        // Ajouter les avertissements de seuil de sécurité si nécessaire
        const securityWarnings = stockIssues.filter(issue => issue.issue === 'security_threshold');
        if (securityWarnings.length > 0) {
            response.warnings = {
                message: "Certains produits sont passés sous leur seuil de sécurité",
                products: securityWarnings
            };
        }

        res.json(response);

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Erreur lors du service de la commande:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors du service de la commande",
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.getShopDailyStats = async (req, res) => {
    let connection;
    try {
        const shopId = req.params.shopId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        connection = await pool.getConnection();
        
        // Requête pour les stats quotidiennes du jour
        const dailyStatsQuery = `
            SELECT 
                DATE(created_at) as order_date,
                COUNT(*) as total_orders,
                SUM(total) as daily_revenue,
                SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as served_orders,
                SUM(CASE WHEN status = 'accepted' THEN total ELSE 0 END) as served_revenue
            FROM orders 
            WHERE 
                shop_id = ? 
                AND DATE(created_at) = DATE(NOW())
            GROUP BY 
                DATE(created_at)
        `;

        // Requête pour les revenus journaliers du mois en cours
        const monthlyDailyRevenueQuery = `
            SELECT 
                DATE(created_at) as date,
                SUM(CASE WHEN status = 'accepted' THEN total ELSE 0 END) as revenue
            FROM orders 
            WHERE 
                shop_id = ? 
                AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
                AND status = 'accepted'
            GROUP BY 
                DATE(created_at)
            ORDER BY 
                date ASC
        `;

        const topProductsQuery = `
        SELECT 
            p.id AS product_id,
            p.name AS product_name,
            SUM(op.nb) AS total_quantity
        FROM order_products op
        INNER JOIN products p ON op.product_id = p.id
        INNER JOIN orders o ON op.orders_id = o.id
        WHERE 
            o.shop_id = ?
        GROUP BY 
            p.id, p.name
        ORDER BY 
            total_quantity DESC
        LIMIT 10
    `;

        const [dailyResults] = await connection.query(dailyStatsQuery, [shopId]);
        const [monthlyDailyResults] = await connection.query(monthlyDailyRevenueQuery, [shopId]);
        const [topProductsResults] = await connection.query(topProductsQuery, [shopId]);

        // Formatage des résultats quotidiens
        const dailyStats = dailyResults.length > 0 ? {
            date: dailyResults[0].order_date,
            total_orders: dailyResults[0].total_orders,
            daily_revenue: dailyResults[0].daily_revenue || 0,
            served_orders: dailyResults[0].served_orders || 0,
            served_revenue: dailyResults[0].served_revenue || 0,
            average_order_value: dailyResults[0].daily_revenue / dailyResults[0].total_orders || 0,
            completion_rate: (dailyResults[0].served_orders / dailyResults[0].total_orders * 100) || 0
        } : {
            date: today,
            total_orders: 0,
            daily_revenue: 0,
            served_orders: 0,
            served_revenue: 0,
            average_order_value: 0,
            completion_rate: 0
        };

        // Traitement des données journalières du mois
        const dailyRevenueData = monthlyDailyResults.map((item, index) => {
            const currentRevenue = parseFloat(item.revenue) || 0;
            const previousRevenue = index > 0 ? parseFloat(monthlyDailyResults[index - 1].revenue) || 0 : currentRevenue;
            const percentageChange = previousRevenue > 0 
                ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
                : 0;

            return {
                date: item.date,
                day: new Date(item.date).getDate(),
                revenue: currentRevenue,
                percentageChange: parseFloat(percentageChange.toFixed(2))
            };
        });

        // Calculer le changement par rapport au jour précédent pour aujourd'hui
        const currentDayRevenue = dailyRevenueData[dailyRevenueData.length - 1]?.revenue || 0;
        const previousDayRevenue = dailyRevenueData[dailyRevenueData.length - 2]?.revenue || 0;
        const dailyPercentageChange = previousDayRevenue > 0 
            ? ((currentDayRevenue - previousDayRevenue) / previousDayRevenue) * 100 
            : 0;

            const topProducts = topProductsResults.map((product) => ({
                product_id: product.product_id,
                product_name: product.product_name,
                total_quantity: product.total_quantity
            }));

        res.json({
            topProducts,
            daily: dailyStats,
            currentMonth: {
                data: dailyRevenueData,
                currentDayRevenue,
                dailyPercentageChange: parseFloat(dailyPercentageChange.toFixed(2))
            }
        });

    } catch (error) {
        console.error('Erreur lors du calcul des statistiques:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur lors du calcul des statistiques'
        });
    } finally {
        if (connection) connection.release();
    }
};

exports.newOrders = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const data = req.body;

        // Insérer les données de la commande
        const orderData = {
            ref: data.ref,
            users_id: data.users_id,
            total: data.total,
            adresse: data.adresse,
            livraison: data.livraison,
            shop_id: data.shop_id,
            code_retrait: data.code_retrait,
            createdAt: new Date(),
            statut: data.statut,
            livreur_id: data.livreur_id,
            client_latitude: data.client_latitude,
            client_longitude: data.client_longitude,
        };

        const [orderResult] = await connection.query(
            `INSERT INTO orders (ref, users_id, total, code_retrait, delivery_adresse, livraison, shop_id, created_at, status, livreur_id, client_latitude, client_longitude)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orderData.ref,
                orderData.users_id,
                orderData.total,
                orderData.code_retrait,
                orderData.adresse,
                orderData.livraison,
                orderData.shop_id,
                orderData.createdAt,
                orderData.statut,
                orderData.livreur_id,
                orderData.client_latitude,
                orderData.client_longitude,
            ]
        );

        const orderId = orderResult.insertId;

        // Insérer les produits de la commande
        for (const product of data.products) {
            await connection.query(
                `INSERT INTO order_products (name, price, rayon_id, categorie_id, nb, shop_id, orders_id, photo_id, product_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    product.name,
                    product.price,
                    product.rayon_id,
                    product.categorie_id,
                    product.nb,
                    product.shop_id,
                    orderId,
                    product.photoUrl,
                    product.id,
                ]
            );
        }

        await connection.commit();

        res.json({
            success: true,
            message: "Commande créée avec succès",
            orderId: orderId
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Erreur lors de la création de la commande:', error);
        res.status(500).json({
            success: false,
            message: "Erreur lors de la création de la commande",
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};