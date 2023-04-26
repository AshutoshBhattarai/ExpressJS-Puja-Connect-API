/* -------------------------------------------------------------------------- */
/*                               Package Imports                              */
/* -------------------------------------------------------------------------- */
const express = require("express");
const router = express();
const nodemailer = require("nodemailer");
const argon2 = require("argon2");
const hbs = require("nodemailer-express-handlebars");
const handlebars = require("handlebars");
const path = require("path");
const otp = require("otp-generator");
const db = require("../Database/DBConnection");
const jwt = require("jsonwebtoken");
const bodyparser = require("body-parser");
require("dotenv").config();
const jwt_secret = process.env.JWT_SECRET_KEY;
const domain = process.env.ROOT_IP;
/* ------------------------------- Middlewares ------------------------------ */
router.use(express.json());
router.use(bodyparser.urlencoded({ extended: true }));

/* -------------------------------------------------------------------------- */
/*                                   Routes                                   */
/* -------------------------------------------------------------------------- */

/* ----------------- Getting all Customers from the database ---------------- */
router.get("/all", async (req, res) => {
  try {
    const result = await db.query("Select * from Customers");
    if (result.rowCount == 0) {
      res.status(404).render("404");
    } else {
      res.status(200).send(result.rows);
    }
  } catch (error) {
    console.log(error);
  }
});

/* --------------------------- User authentication -------------------------- */
router.post("/auth", async (req, res) => {
  try {
    let user = "";
    let { email, password, phone } = req.body;
    // let regex = /^(\+91-|\+91|0)?\d{10}$/;
    // const isPhone = regex.test(phone);
    if (email == null) {
      user = await db.query("SELECT * FROM Customers WHERE phone = $1", [
        phone,
      ]);
    } else {
      user = await db.query("SELECT * FROM Customers WHERE email = $1", [
        email,
      ]);
    }
    if (user.rowCount == 0) {
      res.status(404).send({ message: "Phone number not found" });
    } else {
      const role = user.rows[0].role;
      const pass = user.rows[0].password;
      let isValid = await argon2.verify(`${pass}`, `${password}`);
      if (isValid) {
        // console.log(phone.rows);
        if (role == "Customer") res.status(200).send(user.rows);
        else if (role == "Delivery") res.status(201).send(user.rows);
        else if (role == "Admin") res.status(202).send(user.rows);
      } else {
        res.status(400).send({ message: "Password does not match" });
      }
    }
  } catch (error) {
    console.log(error);
  }
});

/* ------------------------ Find User by Phone Number ----------------------- */
router.get("/phone/:id", async (req, res) => {
  try {
    const result = await db.query("Select * from Customers where phone=$1", [
      req.params.id,
    ]);
    if (result.rowCount == 0) {
      res.status(404).render("404");
    } else {
      res.status(200).send(result.rows);
    }
    // console.log(result.rowCount);
    // console.log(result.rows);
  } catch (error) {
    console.log(error);
  }
});

/* -------------------------- Find User by Username ------------------------- */
router.get("/name/:id", async (req, res) => {
  try {
    const result = await db.query("Select * from Customers where username=$1", [
      req.params.id,
    ]);
    //console.log(result.rowCount);
    if (result.rowCount == 0) {
      res.status(400).render("404");
    } else {
      res.status(200).send(result.rows);
    }
  } catch (error) {
    console.log(error);
  }
});

/* ----------------------------- Find User By ID ---------------------------- */
router.get("/id/:id", async (req, res) => {
  try {
    const result = await db.query("Select * from Customers where user_id=$1", [
      req.params.id,
    ]);
    if (result.rowCount == 0) {
      res.status(404).render("404");
    } else {
      res.status(200).send(result.rows);
    }
    // console.log(result.rowCount);
    // console.log(result.rows);
  } catch (error) {
    console.log(error);
  }
});

/* ------------------- Create a new user(Customer Account) ------------------ */
router.post("/insert", async (req, res) => {
  try {
    console.log(req.body);
    const phone = await db.query(`Select * from Customers where phone=$1`, [
      req.body.phone,
    ]);
    if (phone.rowCount == 0) {
      let hash = await argon2.hash(req.body.password);
      const results = await db.query(
        "INSERT INTO Customers(username,password,phone,address,role,email) VALUES($1,$2,$3,$4,'Customer',$5)",
        [
          req.body.username,
          hash,
          req.body.phone,
          req.body.address,
          req.body.email,
        ]
      );
      res.status(200).send({ message: "Account created successfully." });
      console.log("Data Inserted Sucessfully");
    } else if (phone.rowCount != 0) {
      res.sendStatus(400);
      //console.log(phone.rowCount);
    }
  } catch (error) {
    console.log(error.message);
  }
});

/* ------------------------- Update user info routes ------------------------ */
/* ---------------------- Update user info by id ---------------------- */
router.put("/update/:id", async (req, res) => {
  try {
    const phone = await db.query("Select * from Customers where user_id = $1", [
      req.params.id,
    ]);
    const dbphone = phone.rows.map((row) => row.phone);
    const reqphone = req.body.phone;

    if (phone.rowCount == 0) {
      const results = await db.query(
        `Update Customers 
                set username = $1,
                password=$2,
                phone=$3,
                address=$4
                where user_id=$5
                returning *`,
        [
          req.body.username,
          req.body.password,
          req.body.phone,
          req.body.address,
          req.params.id,
        ]
      );
      if (results.rows != 0) {
        res.status(200).send({ message: "OK" });
        console.log("Record Updated Sucessfully");
      } else {
        res.status(400).send({ message: "Error" });
      }
    } else if (phone.rowCount != 0 && dbphone == reqphone) {
      const results = await db.query(
        `Update Customers 
                set username = $1,
                password=$2,
                phone=$3,
                address=$4
                where user_id=$5
                returning *`,
        [
          req.body.username,
          req.body.password,
          req.body.phone,
          req.body.address,
          req.params.id,
        ]
      );
      if (results.rows != 0) {
        res.status(200).send({ message: "OK" });
        console.log("Record Updated Sucessfully");
      } else {
        res.status(400).send({ message: "Error" });
      }
    } else {
      res.status(401).send({ message: "Phone already in use" });
    }
  } catch (error) {
    console.log(error);
  }
});

/* ----------------- Update user details by confirming password ---------------- */
/* ---------------------------- Update user name ---------------------------- */
router.post("/update/name", async (req, res) => {
  const { user_id, password, username } = req.body;
  if (!(await verifyPassword(user_id, password)))
    res.status(404).send({ message: "Error" });
  else {
    const newName = await db.query(
      "Update customers set username = $1 where user_id = $2",
      [username, user_id]
    );
    res.status(200).send({ message: "Success" });
  }
});

/* ---------------------------- Update user email --------------------------- */
router.post("/update/email", async (req, res) => {
  const { user_id, password, email } = req.body;
  if (!(await verifyPassword(user_id, password)))
    res.status(404).send({ message: "Error" });
  else {
    const newEmail = await db.query(
      "Update customers set email = $1 where user_id = $2",
      [email, user_id]
    );
    res.status(200).send({ message: "Success" });
  }
});

/* -------------------------- Update user password -------------------------- */
router.post("/update/password", async (req, res) => {
  const { user_id, password, new_pass } = req.body;
  if (!(await verifyPassword(user_id, password)))
    res.status(404).send({ message: "Error" });
  else {
    const hashPass = await argon2.hash(new_pass)
    const newPass = await db.query(
      "Update customers set password = $1 where user_id = $2",
      [hashPass, user_id]
    );
    res.status(200).send({ message: "Success" });
  }
});
/* ------------------------ Update user phone number ------------------------ */
router.post("/update/phone", async (req, res) => {
  const { user_id, password, phone } = req.body;
  if (!(await verifyPassword(user_id, password)))
    res.status(404).send({ message: "Error" });
  else {
    const newPhone = await db.query(
      "Update customers set phone = $1 where user_id = $2",
      [phone, user_id]
    );
    res.status(200).send({ message: "Success" });
  }
});
/* --------------------------- Update user address -------------------------- */
router.post("/update/address", async (req, res) => {
  const { user_id, password, username } = req.body;
  if (!(await verifyPassword(user_id, password)))
    res.status(404).send({ message: "Error" });
  else {
    const newAddress = await db.query(
      "Update customers set address = $1 where user_id = $2",
      [username, user_id]
    );
    res.status(200).send({ message: "Success" });
  }
});
/* ------------------------- Delete user info by id ------------------------- */
router.delete("/delete/:id", async (req, res) => {
  try {
    //const result =await db.query("Delete from Customers where phone=$1",[req.params.del_id])
  } catch (error) {
    console.log(error);
  }
});

/* ------------ Route to check if user exists and send reset link ----------- */
// router.post("/reset/email", async (req, res) => {
//  const {email} = req.body;
//  try {
//   const result = await db.query("SELECT * FROM customers WHERE email = $1",[email]);
//   //console.log(result.rows);
//   if (result.rowCount == 0)
//   {
//     res.status(404).send({message: "Email not found"});
//   }
//   else
//   {
//     const userid = result.rows[0].user_id;
//     const password = result.rows[0].password;
//     const email = result.rows[0].email;
//     const secret = jwt_secret + password;
//     const payload = {
//       email : email,
//       id : userid
//     }
//     const token = jwt.sign(payload, secret,{expiresIn : '5m'});
//     const link = `${domain}/users/reset/password/${userid}/${token}`
//     console.log(link);
//     //function to send link
//     //sendResetEmail(link)
//     res.status(200).send({message: "Success!"});
//   }
//  } catch (error) {
//   res.status(500).send({message: "Error"})
//   console.log(error);
//  }
// })

/* ---------------------- Reset link to change password --------------------- */
//router.route('/reset/password/:id/:token')
// .get(async(req, res) => {
//   const {id, token} = req.params;
//   try {
//     const result = await db.query("SELECT * FROM customers WHERE user_id = $1",[id]);
//     if (result.rowCount == 0)
//     {
//       //res.status(404).render('passwordreset',{message: "Email not found"});
//       res.send("No User Found");
//     }
//     else
//     {
//       const secret = jwt_secret + result.rows[0].password;
//       const payload = jwt.verify(token, secret);
//       res.render('passwordreset',{email : result.rows[0].email});
//     }

//   } catch (error) {
//     console.log(error);
//   }

// })
// .post(async (req, res)=>{
//   const {id, token} = req.params;
//   console.log(req.body);
//   try {
//     const result = await db.query("SELECT * FROM customers WHERE user_id = $1",[id]);
//     if (result.rowCount == 0)
//     {
//       //res.status(404).render('passwordreset',{message: "Email not found"});
//       res.send("No User Found");
//     }
//     else
//     {
//       const secret = jwt_secret + result.rows[0].password;
//       const payload = jwt.verify(token, secret);
//       res.send(req.body)
//     }

//   } catch (error) {
//     console.log(error);
//   }

// })

/* ------------------------ Reset Link second method ------------------------ */
/* ------------ Route to check if user exists and send reset link ----------- */
router.post("/reset/email", async (req, res) => {
  const { email } = req.body;
  try {
    const result = await db.query("SELECT * FROM customers WHERE email = $1", [
      email,
    ]);
    if (result.rowCount == 0) {
      res.status(404).send({ message: "Email not found" });
    } else {
      const userid = result.rows[0].user_id;
      const otpCode = otp.generate(6, {
        upperCaseAlphabets: false,
        specialChars: false,
        lowerCaseAlphabets: false,
      });
      const saveCode = db.query(
        "Update customers set reset_code=$1 where email=$2",
        [otpCode, email]
      );
      const codeHash = await argon2.hash(otpCode);
      const link = `${domain}/users/reset/password/${userid}/${codeHash}`;
      //function to send link
      sendResetEmail(email, link);
      res.status(200).send({ message: "Success!" });
    }
  } catch (error) {
    res.status(500).send({ message: "Error" });
    console.log(error);
  }
});

/* ---------------------- Reset link to change password --------------------- */
router
  .route("/reset/password/:id/:code")
  /* ----------- Check if the link is valid and send the reset page ----------- */
  .get(async (req, res) => {
    const { id, code } = req.params;
    try {
      const result = await db.query(
        "Select reset_code from customers where user_id = $1",
        [id]
      );
      if (result.rowCount == 0 || result.rows[0].reset_code == 0) {
        res.redirect("/*");
      } else {
        const isValid = await argon2.verify(
          code,
          `${result.rows[0].reset_code}`
        );
        if (isValid) res.render("reset-password");
        else res.redirect("/*");
      }
    } catch (error) {
      console.log(error);
    }
  })
  /* -------------------- Change password with new password ------------------- */
  .post(async (req, res) => {
    const { Password } = req.body;
    const { id, code } = req.params;
    const result = await db.query(
      "Select reset_code from customers where user_id = $1",
      [id]
    );
    if (result.rowCount == 0) {
      res.redirect("/*");
    } else {
      const isValid = await argon2.verify(code, `${result.rows[0].reset_code}`);
      if (isValid) {
        const passHash = await argon2.hash(Password);
        const newPassword = await db.query(
          "Update customers set password =$1,reset_code=$3 where user_id = $2",
          [passHash, id, 0]
        );
        res.send("Password updated successfully");
      } else {
        res.redirect("/*");
      }
    }
  });

router.post("/change/role", async (req, res) => {
  const { role, password, user_id } = req.body;
  console.log(req.body);
  try {
    const result = await db.query(
      "Update customers set role = $1 where user_id = $2",
      [role, user_id]
    );
    console.log(result.rows);
    res.send({ message: "Role updated successfully" }).status(200);
  } catch (err) {
    res.status(500).send({ message: err });
  }
});
/* -------------------- Function to verify user password -------------------- */
async function verifyPassword(id, password) {
  let result = await db.query(
    "Select password from customers where user_id = $1",
    [id]
  );
  let validate = await argon2.verify(
    `${result.rows[0].password}`,
    `${password}`
  );
  if (validate) return true;
  else return false;
}

/* --------------- Function to send user reset password email --------------- */
async function sendResetEmail(email, link) {
  let transport = nodemailer.createTransport({
    service: "gmail",
    port: 2525,
    auth: {
      user: process.env.EMAIL_ID,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  transport.use(
    "compile",
    hbs({
      viewEngine: {
        partialsDir: path.resolve("./Views"),
        extname: ".handlebars",
        defaultLayout: false,
      },
      viewPath: path.resolve("./Views"),
    })
  );
  const mailOptions = {
    from: "TestApp@app.com",
    to: email,
    subject: "Reset your password",
    template: "resetpasslink",
    context: {
      link: link,
    },
  };
  transport.sendMail(mailOptions, function (err, info) {
    if (err) {
      return err;
      console.log(err);
    } else {
      console.log(info);
      return info;
    }
  });
}

module.exports = router;
