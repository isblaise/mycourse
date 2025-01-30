const express = require("express")
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { createServer } = require("http");


const port = 5000;
const app = express();


app.use(cors());
app.use(express.json());

const usersAuthRoutes = require('./routes/usersAuthRoute');
const shopAuthRoutes = require('./routes/shopAuthRoute');
const rayonRoutes = require('./routes/rayonRoute');
const productRoutes = require('./routes/productRoute');
const deliveryRoutes = require('./routes/deliveryRoute');
const categorieRoutes = require('./routes/categorieRoute')
const emailRoutes = require('./routes/emailRoute');
const orderRoutes = require('./routes/orderRoute');
const imagesUploader = require('./routes/routeUploadImages');
const favoritePlaceRoute = require('./routes/favoritePlaceRoute');

app.use(express.urlencoded({ extended: true }));
app.use('/api/users', usersAuthRoutes);
app.use('/api/shops', shopAuthRoutes); 
app.use('/api/rayon', rayonRoutes);
app.use('/api/product', productRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/categories', categorieRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/uploader', imagesUploader);
app.use('/api/favorite-place', favoritePlaceRoute);


app.use(bodyParser.json());

app.use('/images', express.static(path.join(__dirname, 'uploads/images')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.listen(port, () =>{
    console.log("server lancer")
});