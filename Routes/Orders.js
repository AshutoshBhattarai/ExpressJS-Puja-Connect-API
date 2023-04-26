/* --------------------------------- Imports -------------------------------- */
const express = require("express");
const router = express();
const axios = require("axios");
const fs = require("fs");
const qr = require("qrcode");
const fs2 = require("fs-extra");
const puppeteer = require("puppeteer");
const handlebars = require("handlebars");
const nodemailer = require("nodemailer");
const bodyparser = require("body-parser");
const db = require("../Database/DBConnection");
const otp = require("otp-generator");
const multer = require("multer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");
require("dotenv").config();
const ip = process.env.ROOT_IP;

/* ------------------------------- Middlewares ------------------------------ */
/* -------------------- Convert requset data to json format -------------------- */
router.use(express.json());
/* ----------------------- Setting view engine as ejs ----------------------- */
router.set("view engine", "ejs");
/* ------------------------------ Multer config ----------------------------- */
const imgstorage = multer.diskStorage({
  destination: "./images",
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({
  storage: imgstorage,
});

/* ----------------------------- parse form data ---------------------------- */
router.use(
  bodyparser.urlencoded({
    extended: true,
  })
);

/* ------------------ Route for saving and retriving orders ----------------- */
router
  .route("/order")
  .post(async (req, res) => {
    console.log("Order received");
    console.log(req.body);
    const userid = req.body.user_id;
    const total = req.body.total;
    const location = req.body.location;
    const order = req.body.orders;
    const date = new Date();
    let deliveryDate = "";
    if (req.body.delivery_date == "") {
      deliveryDate = initDate();
    } else {
      deliveryDate = req.body.delivery_date;
    }
    const otpCode = otp.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });


    try {
      const id = await db.query(
        "INSERT INTO orders(user_id,order_date,total,status,location,otp,delivery_date)Values($1,$2,$3,'Not Delivered',$4,$5,$6) returning *",
        [userid, date, total, location, otpCode, deliveryDate]
      );
      const orderid = id.rows[0].id;
      qr.toFile(
        "./Docs/QRCodes/" + orderid + ".png",
        otpCode,
        { width: "300dp" },
        (err, code) => {
          if (err) console.log(err);
          else console.log(code);
        }
      );
      for (let i = 0; i < order.length; i++) {
        const result = await db.query(
          "INSERT INTO orderdetail(order_id,prod_id,quantity)Values($1,$2,$3) returning *",
          [orderid, order[i].prod_id, order[i].quantity]
        );
        const updateStock = await db.query(
          "Update product set prod_stock=prod_stock - $1 where prod_id=$2",
          [order[i].quantity, order[i].prod_id]
        );
      }
      const productinfo = await db.query(
        `SELECT product.prod_id,prod_name,prod_price,quantity
      from 
      product
      INNER JOIN orderdetail on product.prod_id=orderdetail.prod_id
      where order_id=$1`,
        [orderid]
      );
      const orderdata = productinfo.rows.map((m) => ({
        name: m.prod_name,
        price: m.prod_price,
        quantity: m.quantity,
      }));
      const data = {
        user: userid,
        total: total,
        orderdate: new Date(),
        orderid: orderid,
        location: location,
        order: orderdata,
      };
      //console.log(data);
      sendMail(data);
      createPDF(data);
      checkStock();
    } catch (error) {
      console.log("Error : " + error);
    }
  })
  .get(async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM orders");
      let arr = result.rows;
      let data = arr.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        order_date: m.order_date,
        total: m.total,
        status: m.status,
        lat: m.location.lat,
        lng: m.location.lng,
      }));
      res.send(data);
    } catch (error) {
      console.log("Error : " + error);
    }
  });

/* --------------------------- Getting all orders --------------------------- */
router.get("/all", async (req, res) => {
  try {
    const result = await db.query(`SELECT * from orders`);
    if (result.rowCount == 0) {
      res.status(400);
      res.render("404");
    } else {
      res.status(200).send(result.rows);
      //console.log(result.rowCount);
      console.log("pack received");
    }
  } catch (error) {
    console.log(error);
  }
});

/* --------------------- Getting order with specific id --------------------- */
router.get("/:id", async (req, res) => {
  try {
    const result = await db.query(`SELECT * from orders where user_id=$1`, [
      req.params.id,
    ]);
    if (result.rowCount == 0) {
      res.status(400);
      res.render("404");
    } else {
      res.status(200).send(result.rows);
      //console.log(result.rowCount);
      console.log("Pack received");
    }
  } catch (error) {
    console.log(error);
  }
});

/* ---------------- Getting the detail of order with given id --------------- */
router.get("/detail/:id", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT product.prod_id,prod_name,prod_price,quantity,image
        from 
        product
        INNER JOIN orderdetail on product.prod_id=orderdetail.prod_id
        where order_id=$1`,
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
        prod_price: m.prod_price,
        quantity: m.quantity,
        image: ip + "/images/" + m.image,
      }));
      res.status(200).send(newdata);
      //console.log(result.rowCount);
      console.log("pack received");
    }
  } catch (error) {
    console.log(error);
  }
});

/* ----------------- Change the status of order to delivered ---------------- */
/* ------------------------------- Not in use ------------------------------- */
router.post("/delivered", async (req, res) => {
  // try {
  console.log(req.body);
  //   const result = await db.query(
  //     "Update orders set status='Delivered' where id=$1",
  //     [req.body.id]
  //   );
  //   if (result.rows == 0) {
  //     res.status(200).send({ message: "Order status updated" });
  //   } else {
  //     res.status(400).send({ message: "Failed to update order" });
  //   }
  // } catch (error) {
  //   console.log(error);
  // }
});

/* ------------- Confirm the delivery of order and change status ------------ */
router.post("/confrimdelivery", async (req, res) => {
  try {
    console.log(req.body);
    const otp = req.body.otp;
    const id = req.body.id;
    const code = await db.query("SELECT otp FROM orders WHERE id = $1", [id]);
    console.log(code.rows[0].otp);
    if (otp == code.rows[0].otp) {
      const result = await db.query(
        "Update orders set status='Delivered' where id=$1",
        [id]
      );
      if (result.rows == 0) {
        res.status(200).send({ message: "Order status updated" });
      } else {
        res.status(401).send({ message: "Failed to update order" });
      }
    } else {
      res.status(400).send({ message: "Code not found" });
    }
  } catch (error) {
    console.log(error);
  }
});

/* ------------------------------ Cancel order ------------------------------ */
router.post("/cancel/", async (req, res) => {
  try {
    // console.log(req.body);
    let orders = req.body.orders;
    let bill = req.body.user_id;
    //console.log(bill);
    //console.log(orders);
    const result = await db.query(
      "Update orders set status='Cancelled' where id=$1",
      [bill]
    );
    if (result.rows == 0) {
      for (let i = 0; i < orders.length; i++) {
        const updateStock = await db.query(
          "Update product set prod_stock=prod_stock + $1 where prod_id=$2",
          [orders[i].quantity, orders[i].prod_id]
        );
      }
      res.status(200).send({ message: "Order status updated" });
    } else {
      res.status(400).send({ message: "Failed to change status" });
    }
  } catch (error) {
    console.log(error);
  }
});

/* -------------------- Find the invoice of certain order ------------------- */
router.post("/invoice", (req, res) => {
  let user_id = req.body.user_id;
  let order_id = req.body.id;
  const path =
    process.cwd() + "/Docs/Invoice/" + user_id + "--" + order_id + ".pdf";
  if (fs.existsSync(path)) {
    res.status(200).send({ message: "invoice/" + user_id + "/" + order_id });
  } else {
    res.status(404).send({ message: "No File Found" });
  }
});

/* ------------------ Download the invoice of certain order ----------------- */
router.get("/invoice/:user/:order", async (req, res) => {
  const user_id = req.params.user;
  const order_id = req.params.order;
  const filePath =
    process.cwd() + "/Docs/Invoice/" + user_id + "--" + order_id + ".pdf";

  res.status(200).download(filePath, function (err) {
    if (err) {
      res.status(404).send({ message: err.code });
    }
  });
});

/* ------------------- Function to send mail to the admin ------------------- */
/* ------------------------ To notify about an order ------------------------ */
async function sendMail(data) {
  const { user, total, location, order, orderid, orderdate } = data;
  let username = await getUsername(user);
  let address = await getAddress(location.lat, location.lng);
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
    from: process.env.EMAIL_ID,
    to: process.env.EMAIL_ID,
    subject: "New Order Placed",
    template: "emailnotify",
    context: {
      user: username,
      total: total,
      location: address,
      order: order,
      orderid: orderid,
      date: orderdate,
    },
  };
  transport.sendMail(mailOptions, function (err, info) {
    if (err) {
      console.log(err);
    } else {
      //console.log(info);
    }
  });
}

/* -------------------- Function to find user info by id -------------------- */
async function getUsername(id) {
  try {
    const result = await db.query(
      "Select username from customers where user_id = $1",
      [id]
    );
    if (result.rows != 0) {
      return result.rows[0].username;
    } else {
      return "No data Found";
    }
  } catch (error) {
    console.log(error);
  }
}

/* -------------- Converting latitude and longitude to address -------------- */
async function getAddress(lat, lng) {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const {
      house_number,
      road,
      neighbourhood,
      suburb,
      municipality,
      region,
      postcode,
    } = response.data.address;
    const address =
      house_number +
      "," +
      road +
      "," +
      neighbourhood +
      "," +
      suburb +
      "," +
      municipality +
      "," +
      region +
      "," +
      postcode +
      "," +
      "Nepal";
    const address2 =
      house_number +
      "," +
      road +
      "," +
      neighbourhood +
      "," +
      suburb +
      "," +
      municipality;
    return address2;
  } catch (error) {
    console.log(error);
  }
}

/* -------------------- Creating pdf invoice of a specific order -------------------- */
async function createPDF(data2) {
  const { user, total, location, order, orderid, orderdate } = data2;
  let username = await getUsername(user);
  let address = await getAddress(location.lat, location.lng);
  const reqdata = {
    user: username,
    total: total,
    location: address,
    order: order,
    orderid: orderid,
    date: orderdate,
  };
  const compile = async function (templateName, data) {
    const filePath = path.join(
      process.cwd(),
      "Views",
      `${templateName}.handlebars`
    );
    const html = await fs2.readFile(filePath, "utf8");
    return handlebars.compile(html)(data);
  };
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const content = await compile("InvoiceTemplate", reqdata);
    await page.setContent(content);
    await page.pdf({
      path:
        process.cwd() +
        "/Docs/Invoice/" +
        data2.user +
        "--" +
        data2.orderid +
        ".pdf",
      format: "A4",
      printBackground: true,
    });
    await browser.close();
  } catch (err) {
    console.log(err);
  }
}

/* -------------- Sending notification to the admin about sotck ------------- */
function sendNotification(name, id) {
  //initialize the firebase notification service
  const FCM = require("fcm-node");
  const serverKey = process.env.FCM_SERVER_KEY;
  var fcm = new FCM(serverKey);
  //Create the notification message
  var message = {
    //this may vary according to the message type (single recipient, multicast, topic, et cetera)
    //Whom to send the notification to
    to: "/topics/AdminNotify",
    notification: {
      title: `${name} Stock Finished`,
      body: `Stock of product ${id} has finished please update the details 😁❤️`,
    },
  };
  //send the notification
  fcm.send(message, function (err, response) {
    if (err) {
      console.log("Something has gone wrong!" + err);
    } else {
      console.log("Successfully sent with response: ", response);
    }
  });
}
/* ------------------------- Function to check stock ------------------------ */
/* ---------------- Used whenever a customer places an order ---------------- */
async function checkStock() {
  console.log("Product Checking Started");
  const stock = await db.query(
    "SELECT prod_stock,prod_name,prod_id FROM product"
  );
  //console.log(stock.rows);
  //Running loop to find stock of products
  for (let x = 0; x < stock.rows.length; x++) {
    if (stock.rows[x].prod_stock <= 0) {
      //if stock is not available then send notification
      sendNotification(stock.rows[x].prod_name, stock.rows[x].prod_id);
      //console.log("Notification sent");
    }
  }
  console.log("Product Checking Completed");
}

/* ------------------ Function to get date 7 days from now ------------------ */
/* ------------- Used for customers who didnt give delivery date ------------ */
function initDate() {
  //Getting current date
  var currentDate = new Date();
  //adding 7 days from now to current date
  currentDate.setDate(currentDate.getDate() + parseInt(7));
  //formatting date by mm/dd/yyyy
  var dateInmmddyyyy =
    currentDate.getFullYear() +
    "/" +
    (currentDate.getMonth() + 1 )+
    "/" +
    currentDate.getDate();
  return dateInmmddyyyy;
}

module.exports = router;
