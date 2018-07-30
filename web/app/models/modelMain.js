const axios = require('axios');

const protocol = "http://";
const url = "localhost";

const account_port = "3001";


/*
 * GET all orders by category and keyword
 */
module.exports.get_home = function (req, res) {
    var keyw = req.query.keyword == null ? /.*/ : new RegExp(req.query.keyword, 'i');
    var cat = req.query.category == null ? /.*/ : req.query.category;
    if (cat === "all_categories")
        cat = /.*/;

    var db = req.db;
    var collection = db.get('testproduct');

    function uniq_cats(cats) {
        const len = cats.length;
        let set = new Set();
        for (let key = 0; key < len; key++) {
            set.add(cats[key].cat_name);
        }
        return Array.from(set);
    }

    collection.find({$and: [{"product_name": keyw}, {"cat_name": cat}]},
        function (err, docs) {
            if (req.query.keyword === undefined) //no selection - don't send any products
                collection.find({}, function (err, cats) { //query DB to find categories
                    res.render('home', {
                        "product_list": {},
                        "category_list": cats,
                        "uniq_cats": uniq_cats(cats),
                        "currentUserObj": req.session.currentUserObj
                    })
                });
            else //find products based on category and keyword
                collection.find({}, function (err, cats) { //query DB to find categories
                    res.render('home', {
                        "product_list": docs,
                        "category_list": cats,
                        "uniq_cats": uniq_cats(cats),
                        "currentUserObj": req.session.currentUserObj
                    })
                });
        });
};

/*
 * GET admin page
 */
module.exports.get_admin = function (req, res) {
    if (!req.session.currentUserObj.isAdmin) {
        res.send("Access Denied");
    }

    res.render('admin', {"currentUserObj" : req.session.currentUserObj});
};

/*
 * GET show a transaction
 */
module.exports.get_showorder = function (req, res) {
    const orderId = req.params.order_id;
    const db = req.db;
    const collection = db.get('testorder');

    collection.find({_id: orderId},
        function (err, doc) {
            if (err) {
                res.send("Find failed.");
            }
            else {
                res.render('showorder', {
                    title: 'Show Order No: ' + orderId,
                    order: doc[0],
                    currentUserObj: req.session.currentUserObj
                });
            }
        });
};

/*
 * POST add order
 */
module.exports.post_neworder = (req, res, next) => {
    // new order fields
    const cid = req.body.cid;
    const pid = req.body.pid;
    const q = req.body.quantity;
    const total = req.body.total;

    // database operations
    const db = req.db;
    const collection = db.get('testorder');

    collection.insert(
        {
            "order_datetime": new Date(Date.now()).toISOString(),
            "quantity": q,
            "total_cost": total,
            "customer_id": cid,
            "product_id": pid
        },
        (err, doc) => {
            if (err) {
                res.send("Add order failed");
            } else {
                const product = db.get('testproduct');
                product.find({_id: pid}, (err, doc) => {
                    if (err || parseInt(q) > doc[0].stock_quantity) {
                        res.send("Unable to purchase due to an error. Make sure you are not trying to buy more than available");
                    } else {
                        product.update({_id: pid}, {$set: {stock_quantity: doc[0].stock_quantity - q}})
                            .then(() => {
                                res.render('neworder_success', {confirmation: 'purchased ' + q + ' items'});
                            })
                    }
                });
            }
        }
    )
};

module.exports.post_createproduct = function(req, res) {
    if (!req.session.currentUserObj.isAdmin) {
        res.send("Access Denied");
    }

    //New product params
    const productName = req.body.productname;
    const price = req.body.price;
    const stock = req.body.stock;
    const manufacturer = req.body.manufacturer;
    const supplier = req.body.supplier;
    const category = req.body.category;

    //db operations
    const db = req.db;
    const collection = db.get('testproduct');
    collection.insert(
        {
            "product_name": productName,
            "price": price,
            "manf_name": manufacturer,
            "supplier_name": supplier,
            "stock_quantity": parseInt(stock),
            "cat_name": category
        },
        (err, doc) => {
            if (err) {
                res.send("Create product failed");
            } else {
                res.redirect('/showproduct/' + doc._id);
            }
        }
    )
}


module.exports.post_deleteproduct = function(req, res) {
    if (!req.session.currentUserObj.isAdmin) {
        res.send("Access Denied");
    }

    const productName = req.body.productname;
    const manufacturer = req.body.manufacturer;
    const quantity = req.body.quantity;

    var db = req.db;
    var collection = db.get('testproduct');

    //Remove product entirely if no quantity was entered
    if (quantity == '') {
        collection.remove({"product_name": productName, "manf_name" : manufacturer},
            function (err, doc) {
                if (err) {
                    res.send("Delete failed.");
                }
                else {
                    res.send("Successfully deleted product<br>" + doc + "<br><a href='/admin'>Return to admin home</a>");
                }
            });
    }
    //Decrement stock by quantity specified
    else {
        const parsed_quantity = parseInt(quantity);
        if (isNaN(parsed_quantity)) {
            res.send("Quantity must be a number or left blank.");
        }
        else if (parsed_quantity <= 0) {
            res.send("Quantity must be greater than 0.");
        }
        else {
            collection.update({"product_name": productName, "manf_name" : manufacturer}, {$inc: {"stock_quantity": -1 * parsed_quantity}},
                function (err, doc) {
                    if (err) {
                        res.send("Delete failed.");
                    }
                    else {
                        res.send("Successfully decremented stock by " + parsed_quantity + "<br><a href='/admin'>Return to admin home</a>");
                    }
                });
        }
    }
};

module.exports.post_deletecategory = function(req, res) {
    if (!req.session.currentUserObj.isAdmin) {
        res.send("Access Denied");
    }

    const category = req.body.category;

    var db = req.db;
    var collection = db.get('testproduct');

    collection.remove({"cat_name": category},
        function (err, doc) {
            if (err) {
                res.send("Delete failed.");
            }
            else {
                res.send("Successfully deleted category<br>" + doc + "<br><a href='/admin'>Return to admin home</a>");
            }
        });
};


/*
 * POST update a product
 */
module.exports.post_updateproduct = function(req, res) {
    if (!req.session.currentUserObj.isAdmin) {
        res.send("Access Denied");
    }

    //Params
    var product_id = req.params.productid;
	var product_name = req.body.product_name;
	var manf_name = req.body.manf_name;
	var stock_quantity = req.body.stock_quantity;
	var price = req.body.price;
	var supplier_name = req.body.supplier_name;
	var cat_name = req.body.cat_name;

	//db operations
    var db = req.db;
    var collection = db.get('testproduct');
    collection.update( { "_id" : product_id }, {$set: {"product_name" : product_name, "manf_name": manf_name, "stock_quantity": stock_quantity, "price": price, "supplier_name": supplier_name, "cat_name": cat_name}},
                       function (err, doc) 
                       {
                           if (err) {
                               res.send("Update failed.");
                           }
                           else {
                		  	   res.redirect('/showproduct/' + product_id);
                           }
                       });
};

/*
 * GET edit product form
 */
module.exports.get_editproduct = function (req, res) {
    if (!req.session.currentUserObj.isAdmin) {
        res.send("Access Denied");
    }
    const product_id = req.params.product_id;
    const db = req.db;
    const collection = db.get('testproduct');
    collection.find(
        {_id: product_id},
        function (err, doc) {
            if (err) {
                res.send("Find failed.");
            }
            else {
                res.render('editproduct', {title: 'Editing Product #' + product_id, product: doc[0], product_id: product_id, "currentUserObj" : req.session.currentUserObj});
            }
        }
    );
};


/*
 * GET product
 */
module.exports.get_showproduct = function (req, res) {
    const productId = req.params.product_id;
    const db = req.db;
    const collection = db.get('testproduct');

    collection.find({_id: productId},
        function (err, doc) {
            if (err) {
                res.send("Find failed.");
            }
            else {
                res.render('showproduct', {product: doc[0], "currentUserObj": req.session.currentUserObj});
            }
        });
};
/*
 * POST login
 */
module.exports.post_login = function (req, res) {
    const email = req.body.email;
    const password = req.body.password;
    //const db = req.db;
    //const collection = db.get('testaccount');

    console.log(url + ':' + account_port + '/account/login');

    axios.post(protocol + url + ':' + account_port + '/account/login', {email: email, password: password})
    .then(function (response) {
        if(response.status == 200){
            var doc = response.data.doc;
            if(doc[0] === undefined && (email === "" || password === "")) //no username/password entered - error
                res.render('login', {"error": "No Username and/or Password was Entered" });
            else if(doc[0] === undefined) //incorrect username/password - error
                res.render('login', {"error": "Username and/or Password is Incorrect" }); 
            else{ //valid user - save info and redirect to appropriate page
                var custObj = doc[0].isAdmin ? {"customer_id": doc[0].customer_id, "customer_email": doc[0].customer_email, "isAdmin": true} :
                    {"customer_id": doc[0].customer_id, "customer_email": doc[0].customer_email, "isAdmin": false};
                req.session.currentUserObj = custObj;
                req.session.save();
               
                //check whether user is customer or admin
                if(doc[0].isAdmin)
                    res.redirect('/admin');
                else
                    res.redirect('/');  
            }   
        } else {
            res.send("Find failed.");
        }
    })
    .catch(function (error) {
        res.send("Login post failed.");
    });

    // collection.find({"customer_email": email, "password": password},
    //     function (err, doc) {
    //         if (err) {
    //             	res.send("Find failed.");
    //         }
    //         else {
    //         		if(doc[0] === undefined && (email === "" || password === "")) //no username/password entered - error
    //         			res.render('login', {"error": "No Username and/or Password was Entered" });
    //         		else if(doc[0] === undefined) //incorrect username/password - error
    //         			res.render('login', {"error": "Username and/or Password is Incorrect" }); 
    //         		else{ //valid user - save info and redirect to appropriate page
    //         			var custObj = doc[0].isAdmin ? {"customer_id": doc[0].customer_id, "customer_email": doc[0].customer_email, "isAdmin": true} :
    //         				{"customer_id": doc[0].customer_id, "customer_email": doc[0].customer_email, "isAdmin": false};
    //             		req.session.currentUserObj = custObj;
    //             		req.session.save();
                		
    //             		//check whether user is customer or admin
    //             		if(doc[0].isAdmin)
    //             			res.redirect('/admin');
    //             		else
    //             			res.redirect('/');
    //         		}	
    //         }
    //     });
};

/*
 * POST log out
 */
module.exports.post_logout = function (req, res) {
	req.session.destroy();
	res.redirect('/');
};

/*
 * GET profile
 */
module.exports.get_showprofile = function (req, res) {
    const customerId = req.params.customer_id;
    const db = req.db;
    let collection = db.get('testcustomer');

    collection.find({_id: customerId},
        function (err, doc, next) {
            if (err) {
                res.send("Find failed.");
            }
            else {
                let customer = doc[0];
                collection = db.get('testorder');
                collection.find({customer_id: customerId},
                    {limit: 10, sort: {order_datetime: -1}}, function (err, doc, next) {
                        if (err) {
                            res.send("Unable to retrieve orders");
                        }
                        else {
                            console.log(customer);
                            console.log(doc[0]);
                            res.render('showprofile',
                                {
                                    customer: customer,
                                    currentUserObj : req.session.currentUserObj,
                                    orders: doc
                                }
                            );
                        }
                    })
            }
        });
};
