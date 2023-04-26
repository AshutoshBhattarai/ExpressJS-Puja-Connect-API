/* -------------------------------------------------------------------------- */
/*                            Not in Use currently                            */
/* -------------------------------------------------------------------------- */

const express = require("express");
const router = express();
const db = require("../Database/DBConnection");
const bodyparser = require("body-parser");
router.use(express.json());
router.use(bodyparser.urlencoded({ extended: true }));
router.get("/all", async (req, res) => {
  try {
    const result = await db.query("Select * from admin");
    console.log(result.rowCount);
    if (result.rowCount == 0) {
      res.status(404).render("404");
    } else {
      res.status(200).send(result.rows);
    }
  } catch (error) {
    console.log(error);
  }
});

router.route("/insert").post( async (req, res) => {
  try {
    //console.log(req.body);
    const phone = await db.query(`Select * from Customers where phone=$1`, [
      req.body.phone,
    ]);
    if (phone.rowCount == 0) {
      const results = await db.query(
        "INSERT INTO Customers(username,password,phone,address,role) VALUES($1,$2,$3,$4,'Admin')",
        [req.body.name,req.body.password, req.body.phone, req.body.address]);
      const admininsert = await db.query("INSERT INTO admin (name,password,phone) VALUES($1,$2,$3)"
      ,[req.body.name,req.body.password, req.body.phone])
      res.status(200).send({ message: "Account created successfully." });
      console.log("Data Inserted Sucessfully");
    } else if (phone.rowCount != 0) {
      res.status(400).send({ message: "User already exists." });
      //console.log(phone.rowCount);
    }
  } catch (error) {
    console.log(error.message);
  }
}).get((req,res)=>{
  res.render("AddAdmin")
});

router.post("/auth", async (req, res) => {
  try {
    console.log(req.body);

    const result = await db.query(
      "Select * from admin where phone=$1 AND password=$2",
      [req.body.a_phone, req.body.a_password]
    );
    if (result.rowCount != 0) {
      res.status(200).send({ message: "Sucess" });
    } else {
      res.status(404).send({ message: "Wrong credentials" });
    }
    console.log(result.rows);
  } catch (error) {
    console.log(error);
  }
});

router.post("/auth2", async (req, res) => {
  try {
    //console.log(req.body);
    const isAdmin = await db.query(
      "Select * from customers where phone = $1 AND role = 'Admin'",
      [req.body.a_phone]
    );
    if (isAdmin.rowCount != 0) {
      res.status(200).send({ message: "Sucess" });
    } else {
      res.status(404).send({ message: "Wrong credentials" });
    }
  } catch (error) {console.log(error);}
});


module.exports = router;
