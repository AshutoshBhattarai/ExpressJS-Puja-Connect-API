//express imports
const express = require('express');
const app = express();
require("dotenv").config();
const cors=require('cors');
//importing routes from routes file
const users=require('./Routes/Users')
const package=require('./Routes/Package')
const admin=require('./Routes/Admin')
const test=require('./Routes/Test')
const order = require('./Routes/Orders')
const products=require('./Routes/Products')
const images=require('./Routes/Images')
const port=process.env.PORT || 5000;
app.use(cors({
    origin: "*",
    }));
app.set('view engine', 'ejs')
//Home Page Url 
app.get("/",(req,res)=>
{
    res.render('Index')
});
//Using middleware to route users request to user file in routes
app.use("/users",users);
//Using middleware to route package request to package file in routes
app.use("/package",package);
//Using middleware to route admin request to admin file in routes
app.use("/admin",admin);
//Using middleware to route products request to products file in routes
app.use("/product",products);
//test html route
app.use("/test",test);
//test html route
app.use("/order",order);
//Using middleware to route images request to images file in routes
app.use("/images",images);
//Error page with error message
app.get('/*', (req, res) => {res.render('404')})
//Creating local server on port 
app.listen(port,(err) =>
{
    if(!err)
    {
        console.log(`Server Up and running on http://localhost:${port}`);
    }
    else{
        console.log("Error Occured" + err)
    }
});
