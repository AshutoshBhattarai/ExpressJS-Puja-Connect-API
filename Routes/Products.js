/* --------------------------------- Imports -------------------------------- */
const express = require("express");
const router = express();
const db = require("../Database/DBConnection");
const bodyparser = require("body-parser");
const multer = require("multer");
require("dotenv").config();
const ip = process.env.ROOT_IP;
/* ------------------------------- Middlewares ------------------------------ */
const imgstorage = multer.diskStorage({
  destination: "./images",
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({
  storage: imgstorage,
});

router.use(
  bodyparser.urlencoded({
    extended: true,
  })
);
router.use(express.json());

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */

/* ------------------------ Getting all products info ----------------------- */
router.get("/all", async (req, res) => {
  try {
    const result = await db.query("Select * from product");
    if (result.rowCount == 0) {
      res.sendStatus(400);
    } else {
      let arr = result.rows;
      let newdata = arr.map((m) => ({
        prod_id: m.prod_id,
        prod_name: m.prod_name,
        prod_stock: m.prod_stock,
        prod_price: m.prod_price,
        image: ip + "/images/" + m.image,
      }));
      res.status(200).send(newdata);
      //console.log(result.rowCount);
    }
  } catch (err) {
    console.log("Error = \n" + err);
  }
});
/* ------------- Inserting product info with image from web view ------------ */
/* ---------------------------- Not used currently -------------------------- */
router
  .route("/product-form")
  .get((req, res) => {
    res.render("Add-Product");
  })
  .post(upload.single("image"), async (req, res) => {
    console.log(req.body);
    try {
      const dbname = await db.query(
        "Select * from product where prod_name=$1",
        [req.body.name]
      );
      if (dbname.rowCount == 0) {
        const result = await db.query(
          "INSERT INTO product (prod_name, prod_stock, prod_price,image) VALUES ($1,$2,$3,$4)",
          [req.body.name, req.body.stock, req.body.price, req.file.filename]
        );
        if (result.rowCount == 0) {
          console.log("Product data Inserted");
          res
            .status(200)
            .render("Add-Product", { data: "Product added successfully" });
        }
      } else {
        console.log("Data already exists");
        const oldstock = await db.query(
          "Update product set prod_stock=$1,prod_price=$3 where prod_name=$2",
          [req.body.stock, req.body.name, req.body.price]
        );
      }
    } catch (error) {
      console.log("Error = \n" + error);
    }
  });

/* -------------------- Sending Product view to the route ------------------- */
/* -------------------------------- Not used -------------------------------- */
router.get("/product-form/update", (req, res) => {
  res.render("UpdateProd");
});
/* ---------------- Sending delete product form -- !!Not Used --------------- */
router.get("/product-form/delete", async (req, res) => {
  try {
    const result = await db.query("Select * from product");
    if (result.rowCount == 0) {
      res.sendStatus(400);
    } else {
      let arr = result.rows;
      let newdata = arr.map((m) => ({
        prod_id: m.prod_id,
        prod_name: m.prod_name,
        prod_stock: m.prod_stock,
        prod_price: m.prod_price,
        image: ip + "/html/images/" + m.image,
      }));
      res.status(200).send(newdata);
      //console.log(result.rowCount);
    }
  } catch (err) {
    console.log("Error = \n" + err);
  }
});

/* ---------------- Insert product detail only with text data --------------- */
/* -------------------- Uploading image is not done here -------------------- */
router.post("/insert", async (req, res) => {
  try {
    const isThere = await db.query(
      "Select * from product where prod_name =$1",
      [req.body.prod_name]
    );
    if (isThere.rowCount == 0) {
      const result = await db.query(
        "INSERT INTO product (prod_name, prod_stock, prod_price,image) VALUES ($1,$2,$3,$4)",
        [
          req.body.prod_name,
          req.body.prod_stock,
          req.body.prod_price,
          req.body.image + ".png",
        ]
      );
      if (result.rowCount == 1) {
        res.status(200).send({ message: "OK" });
        console.log("Product data Inserted");
      } else if (result.rowCount == 0 || result.rowCount > 1) {
        res.status(400).send({ message: "Failed to enter Data" });
        console.log("Failed to enter data");
      }
    } else {
      res.status(401).send({ message: "Already In" });
    }
  } catch (error) {
    console.log("Error = \n" + error);
  }
});

/* ---------------- Updating product data with text data only --------------- */
/* -------------------- Doesn't support uploading images -------------------- */
router.post("/update", async (req, res) => {
  try {
    const { prod_id, prod_name, prod_stock, prod_price } = req.body;
    const result = await db.query(
      `Update product set prod_name=$1 
    ,prod_price =$2 
    , prod_stock = prod_stock +$3 where prod_id = $4`,
      [prod_name, prod_price, prod_stock, prod_id]
    );
    if (result.rowCount == 1) {
      res.status(200).send({ message: "Product Updated" });
    } else if (result.rowCount == 0 || result.rowCount > 1) {
      res.status(400).send({ message: "Product Failed to Update" });
    }
    //console.log(req.body);
  } catch (error) {
    console.log(error);
  }
});

/* ---------------------- Insert new product with image --------------------- */
router.post("/insertWimg", upload.single("image"), async (req, res) => {
  const reqs = req.file;
  console.log(reqs);
  let name = req.body.name;
  let price = req.body.price;
  let stock = req.body.stock;
  let image = req.body.image;
  try {
    const isThere = await db.query(
      "Select * from product where prod_name =$1",
      [req.body.prod_name]
    );
    if (isThere.rowCount == 0) {
      const result = await db.query(
        "INSERT INTO product (prod_name, prod_stock, prod_price,image) VALUES ($1,$2,$3,$4)",
        [name, stock, price, req.body.image]
      );
      if (result.rowCount == 1) {
        res.status(200).send({ message: "OK" });
        console.log("Product data Inserted");
      } else if (result.rowCount == 0 || result.rowCount > 1) {
        res.status(400).send({ message: "Failed to enter Data" });
        console.log("Failed to enter data");
      }
    } else {
      res.status(401).send({ message: "Already In" });
    }
  } catch (error) {
    console.log("Error = \n" + error);
  }
});

/* ------------------------ Update product with image ----------------------- */
router.post("/updateWimg", upload.single("image"), async (req, res) => {
  let name = req.body.name;
  let price = req.body.price;
  let stock = req.body.stock;
  let image = req.body.image;
  let prod_id = req.body.prod_id;
  try {
    const result = await db.query(
      `Update product set prod_name=$1 
    ,prod_price =$2 
    , prod_stock = prod_stock +$3,
    image = $4 where prod_id = $5`,
      [name, price, stock, image, prod_id]
    );
    if (result.rowCount == 1) {
      res.status(200).send({ message: "Product Updated" });
    } else if (result.rowCount == 0 || result.rowCount > 1) {
      res.status(400).send({ message: "Product Failed to Update" });
    }
    //console.log(req.body);
  } catch (error) {
    console.log(error);
  }
});

/* ------------------- Delete specific Product with its id ------------------ */
router.post("/delete/:id", async (req, res) => { 
  try {
    const results = await db.query(`DELETE FROM product WHERE prod_id=$1`, [
      req.params.id,
    ]);
    if (results.rows == 0) {
      res.status(400);
    } else {
      res.status(200);
      //console.log(results.rows);
      console.log("Record Updated Sucessfully");
    }
  } catch (error) {
    console.log(error);
  }
})

/* ------------------------ Exporting all the routes ------------------------ */
module.exports = router;
