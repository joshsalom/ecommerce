
/*
 * GET login page
 */
module.exports.get_login = function (req, res) {
    res.render('login', {"title": 'Login', "error": "" });
};


/*
 * GET buyproduct page
 */
module.exports.get_buyproduct = function (req, res) {
    const quan = req.query.quantity == null ? 0 : req.query.quantity;
    const id = req.query.id;
    const n = req.query.name;
    const pr = req.query.price.valueOf();
    const user = req.session.currentUserObj;
    if (parseInt(quan) > 0) {
        res.render(
            'buyproduct',
            {
                title: 'Purchase confirmation',
                info: {
                    confirm: 'Would you like to buy this product?',
                    quantity: quan,
                    name: n,
                    price: pr,
                    id: id,
                    user: user
                },
                currentUserObj: req.session.currentUserObj
            });
    } else {
        res.redirect('showproduct/' + id);
    }
};

