/* --------------------------------- Imports -------------------------------- */
const express= require ('express')
const router = express()
const multer = require('multer');

/* --------------------- Multer config for images upload -------------------- */
const storage = multer.diskStorage({
  destination: function(req, file, callback) {
    callback(null, '/src/my-images');
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname);
  }
});

/* ------------------- Get image or send image by given id ------------------ */
router.get("/:id",(req,res)=>
{
    res.sendFile(req.params.id,{root : './images'})
})

/* ----------------------- Qrcode image display route ----------------------- */
router.get("/qr/:id",(req,res)=>{
  res.sendFile(req.params.id+".png",{root:'./Docs/QRCodes'})
})

/* ---------------------------- Exporting router ---------------------------- */
module.exports=router;