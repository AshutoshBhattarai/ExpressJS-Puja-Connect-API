/* --------------------------------- Imports -------------------------------- */
const express = require("express");
const router = express();
const axios = require("axios");
const bodyparser = require("body-parser");
const db = require("../Database/DBConnection");
const multer = require("multer");
require("dotenv").config();
const ip = process.env.ROOT_IP;

/* ------------------------------- Middlewares ------------------------------ */
router.use(express.json());
router.set("view engine", "ejs");
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

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */

/* -------------------------- Get all package data -------------------------- */
/* --------------------------- Details not included -------------------------- */
router.get("/all", async (req, res) => {
  try {
    const result = await db.query("Select * from package");

    if (result.rowCount == 0) {
      res.sendStatus(400);
    } else {
      let arr = result.rows;
      let newdata = arr.map((m) => ({
        pack_id: m.pack_id,
        pack_title: m.pack_title,
        pack_description: m.pack_description,
        pack_img: ip + "/images/" + m.pack_img,
      }));
      res.status(200).send(newdata);
     // console.log(result.rowCount);
    }
  } catch (error) {
    console.log(error);
  }
});

/* ----------------------------- Add new package ---------------------------- */
/* -------------------------- Details not included -------------------------- */
/* --------- Only creates packages with title image and description --------- */
/* ---------------------- Doesn't include image upload ---------------------- */
router.post("/insert", async (req, res) => {
  try {
    const result = await db.query(
      "INSERT INTO package(pack_title,pack_description,pack_img) VALUES($1,$2,$3)",
      [req.body.pack_title, req.body.pack_description, req.body.pack_img]
    );
    if (result.rows == 0) {
      res.sendStatus(200);
    }
  } catch (error) {
    console.log("Error" + error);
  }
});

/* ------------------ Add new package with user given image ----------------- */
router.post("/insertwImg",upload.single("image"), async (req, res) => {
  console.log(req.file);
  console.log(req.body);
  try {
    const result = await db.query(
      "INSERT INTO package(pack_title,pack_description,pack_img) VALUES($1,$2,$3)",
      [req.body.name, req.body.desc, req.body.image]
    );
    if (result.rows == 0) {
      res.sendStatus(200);
    }
  } catch (error) {
    console.log("Error" + error);
  }
});

/* -------------------- Updates package without the image ------------------- */
router.put("/update/:id", async (req, res) => {
  try {
    const results = await db.query(
      `Update package set pack_title=$1,pack_description=$2 WHERE pack_id=$3`,
      [
        req.body.pack_title,
        req.body.pack_description,
        req.params.id,
      ]
    );
    if (results.rows == 0) {
      res.sendStatus(400);
    } else {
      res.sendStatus(200);
      //console.log(results.rows);
      console.log("Record Updated Sucessfully");
    }
  } catch (error) {
    console.log(error);
  }
});

/* --------------- Updates package along with user given image -------------- */
/* -------------------- User can upload image with update ------------------- */
router.post("/updatewImg",upload.single("image"), async (req, res) => {
  console.log(req.body);
  console.log(req.file);
  try {
    const results = await db.query(
      `Update package set pack_title=$1,pack_description=$2,pack_img=$3 WHERE pack_id=$4`,
      [
        req.body.name,
        req.body.desc,
        req.body.image,
        req.body.id,
      ]
    );
    if (results.rows == 0) {
      res.sendStatus(400);
    } else {
      res.sendStatus(200);
      //console.log(results.rows);
      console.log("Record Updated Sucessfully");
    }
  } catch (error) {
    console.log(error);
  }
});
/* ------------------------ Delete the whole package ------------------------ */
router.put("/delete/:id", async (req, res) => {
  try {
    const results = await db.query(`DELETE FROM package WHERE pack_id=$1`, [
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
});

/* -------------------------- Old get detail method ------------------------- */
// router.get("/detail/:id", async (req, res) => {
//     try {
//         const result = await db.query(`SELECT product.prod_id,prod_name,prod_stock,prod_price,quantity,image
//         from
//         product
//         INNER JOIN packdetail on product.prod_id=packdetail.prod_id
//         where pack_id=$1`, [req.params.id])
//         if (result.rowCount == 0) {
//             res.status(400)
//             res.render('404')
//         } else {
//             res.status(200).send(result.rows)
//             console.log(result.rowCount)
//             console.log("pack received")
//         }
//     } catch (error) {
//         console.log(error)
//     }
// });

/* ---------------------- Finds package detail with id ---------------------- */
/* ------------------ Get all the product with details ------------------ */

router.get("/detail/:id", async (req, res) => {
  //Change date before sending to the client
  try {
    const result = await db.query(
      `SELECT product.prod_id,prod_name,prod_stock,prod_price,quantity,image
        from 
        product
        INNER JOIN packdetail on product.prod_id=packdetail.prod_id
        where pack_id=$1`,
      [req.params.id]
    );
    let arr = result.rows;
    if (result.rowCount == 0) {
      res.status(400);
      res.render("404");
    } else {
      let newdata = arr.map((m) => ({
        prod_id: m.prod_id,
        prod_name: m.prod_name,
        prod_stock: m.prod_stock,
        prod_price: m.prod_price,
        quantity: m.quantity,
        image: ip + "/images/" + m.image,
      }));
      res.status(200).send(newdata);
      //console.log(result.rowCount);
      console.log("Pack received");
    }
  } catch (error) {
    console.log(error);
  }
});

/* -------------- Insert a specific product to the package list ------------- */
router.post("/detail/insert", async (req, res) => {
  console.log(req.body.rowCount);
  try {
    const result = await db.query(
      "INSERT INTO packdetail (pack_id, prod_id, quantity) VALUES($1,$2,$3) returning *",
      [req.body.pack_id, req.body.prod_id, req.body.quantity]
    );
    if (result.rows == 0) {
      res.sendStatus(200);
      //console.log(result.rows);
    }
  } catch (error) {
    console.log("Error" + error);
  }
});

/* ---------------- Update a specific product in the package ---------------- */
router.post("/detail/update", async (req, res) => {
  try {
    const results = await db.query(
      `UPDATE packdetail set quantity=$3 where pack_id=$1 AND prod_id=$2`,
      [req.body.pack_id, req.body.prod_id, req.body.quantity]
    );
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
});

/* --------------- Delete a specific product from the package --------------- */
router.post("/detail/delete", async (req, res) => {
  try {
    const results = await db.query(
      `DELETE FROM packdetail WHERE pack_id=$1 AND prod_id=$2`,
      [req.body.pack_id, req.body.prod_id]
    );
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
});

/* ----------------- Exporting the routes to the home route ----------------- */
module.exports = router;
