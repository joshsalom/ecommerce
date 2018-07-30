const express = require('express');
const router = express.Router();
const ctrlMain = require("../controllers/main");
const modelMain = require("../models/modelMain");
console.log("Router:"); console.log(router);

/*
 * GET show a transaction
 */
router.get('/orderlist/:order_id', modelMain.get_showorder);

/*
 * POST the form
 */
router.post('/neworder', modelMain.post_neworder);

/* GET home page. */
router.get('/', modelMain.get_home);


/* GET admin page. */
router.get('/admin', modelMain.get_admin);

/*
 * GET show a product
 */
router.get('/showproduct/:product_id', modelMain.get_showproduct);


/*
 * POST create a product
 */
router.post('/createproduct', modelMain.post_createproduct);


/*
 * GET/POST edit product form
 */
router.get('/editproduct/:product_id', modelMain.get_editproduct);
router.post('/editproduct/:productid', modelMain.post_updateproduct);

/*
 * POST delete a product
 */
router.post('/deleteproduct', modelMain.post_deleteproduct);

/*
 * POST delete a category
 */
router.post('/deletecategory', modelMain.post_deletecategory);

/*
 * GET login page
 * POST login data
 */
router.get('/login', ctrlMain.get_login);
router.post('/login', modelMain.post_login);

/*
 * POST sign out
 */
router.get('/logout', modelMain.post_logout);

/*
 * GET show a profile: customer details and transaction history
 */
router.get('/showprofile/:customer_id', modelMain.get_showprofile);

/*
 * GET/POST the buyproduct confirmation page
 */
router.get('/buyproduct', ctrlMain.get_buyproduct);

module.exports = router;
