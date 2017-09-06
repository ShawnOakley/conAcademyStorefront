require("file-loader?name=../index.html!../index.html");

const Web3 = require("web3");
const angular = require("angular");
const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
const $ = require("jquery");
const storeFrontJson = require("../../build/contracts/StoreFront.json");
const erc20TokenContractJson = require("../../build/contracts/ERC20TokenContract.json");

if (typeof web3 !== "undefined") {
    window.web3 = new Web3(web3.currentProvider);
} else {
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.version, { suffix: "Promise" });

const Storefront = truffleContract(storeFrontJson);
Storefront.setProvider(web3.currentProvider);

const ERC20TokenContract = truffleContract(erc20TokenContractJson);
ERC20TokenContract.setProvider(web3.currentProvider);

const storefrontApp = angular.module("storefrontApp", []);
storefrontApp.controller("StorefrontController",
    ["$scope","$location","$http","$q","$window","$timeout",
    function($scope, $location, $http, $q, $timeout) {
       $scope.data = {
            account: null,
            permissions: {
                owner: false,
                admin: false
            },
            contractBalance: 0,
            balance: 0,
            balanceInEth: 0,
            priceInput: 0,
            stockInput: 0,
            productLog: [],
            erc20Balances: {}
       };

        const deploymentPromises = Promise.all([
            Storefront.deployed(),
            ERC20TokenContract.deployed()
        ])
        deploymentPromises
            .then(function(_instance) {
                $scope.contract = _instance[0];
                $scope.thirdPartyToken = _instance[1];
                $scope.productWatcher = $scope.contract.ProductAdded(
                    {}, {fromBlock:0}
                ).watch(function(err, newProduct) {
                    if (err) {
                        console.log("Add Product error:", err);
                    } else {
                        $scope.data.productLog.push(newProduct);
                        let newProductData = {
                            id: parseInt(newProduct.args.productId.toString()),
                            price: parseInt(newProduct.args.initialStock.toString()),
                            stock: parseInt(newProduct.args.price.toString()),
                            active: true
                        }
                        $scope.products.push(newProductData);
                        $scope.$apply();
                    }
                });
                $scope.productWatcher = $scope.contract.ProductRemoved(
                    {}, {fromBlock:0}
                ).watch(function(err, transObj) {
                    if (err) {
                        console.log("Remove Product error:", err);
                    } else {
                        let productId = parseInt(transObj.args.productId.toString());
                        $scope.products[productId].active = false;
                        $scope.$apply();
                    }
                });
            }.bind(this));

        web3.eth.getAccountsPromise().then(function(accounts) {
            $scope.owner = accounts[0];
            if (accounts && accounts.length > 0) {
                $scope.data.account = { label: accounts[0], value: accounts[0]};
                $scope.accounts = accounts.map((account) => {
                    return {label: account, value: account}
                });
            }

            const addThirdPartyTokensPromise = Promise.all([
                $scope.thirdPartyToken.issueTokens(
                    accounts[0],
                    2,
                    {
                        from: accounts[0],
                        gas: 200000
                    }),
                $scope.thirdPartyToken.issueTokens(
                    accounts[1],
                    2,
                    {
                        from: accounts[0],
                        gas: 200000
                    }),
                $scope.thirdPartyToken.issueTokens(
                    accounts[2],
                    2,
                    {
                        from: accounts[0],
                        gas: 200000
                    })
            ]).then(function(_trxObject) {
                $scope.$apply();
                const getBalancePromise = Promise.all([
                $scope.thirdPartyToken.balanceOf(
                    accounts[0],
                    {
                        from: accounts[0]
                    }),
                $scope.thirdPartyToken.balanceOf(
                    accounts[1],
                    {
                        from: accounts[0]
                    }),
                $scope.thirdPartyToken.balanceOf(
                    accounts[2],
                    {
                        from: accounts[0]
                    })
                ])
                return getBalancePromise;
            }).then(function(balanceArray) {
                $scope.data.erc20Balances["testToken"] = {};
                $scope.data.erc20Balances["testToken"][accounts[0]] = $scope.convertBigNumber(balanceArray[0]);
                $scope.data.erc20Balances["testToken"][accounts[1]] = $scope.convertBigNumber(balanceArray[1]);
                $scope.data.erc20Balances["testToken"][accounts[2]] = $scope.convertBigNumber(balanceArray[2]);
                $scope.$apply();
            }).catch(function(err) {
                console.log("_err", err);
            });

            $scope.updateBalance();
            $scope.getInitialInfo();
            $scope.$apply();
        }.bind(this))

       // helper functions ********************************

        $scope.convertBigNumber = (bigNumber) => {
            return parseInt(bigNumber.toString());
        };

        // update scope variables functions ********************************

        $scope.updateBalance = function() {
            return web3.eth.getBalancePromise($scope.data.account.value).then(function(balance) {
                $scope.data.balance = balance.toString();
                $scope.data.balanceInEth = web3.fromWei(parseInt(balance.toString()), "ether");
                $scope.$apply();
            });
        }

        $scope.updateERC20TokenBalance = function(tokenNameParams) {
            let tokenName = tokenNameParams;
            let tokenContract;
            switch (tokenName) {
                case "testToken":
                    tokenContract = $scope.thirdPartyToken;
                default:
                    tokenContract = $scope.thirdPartyToken;
            }

                const getBalancePromise = tokenContract.balanceOf(
                    $scope.data.account.value,
                    {
                        from: $scope.data.account.value
                    }
                )
            getBalancePromise.then(function(_erc20Balance) {
                console.log($scope.convertBigNumber(_erc20Balance));
                $scope.data.erc20Balances[tokenName][$scope.data.account.value] = $scope.convertBigNumber(_erc20Balance);
                $scope.$apply();
            })
        }

        $scope.getInitialInfo = function() {
            if ($scope.contract && $scope.data.account.value) {
                $scope.contract.addAdmin($scope.data.account.value, {from: $scope.data.account.value}).then(function(_trx) {
                    $scope.activeAccountChanged();
                    return $scope.contract.addAdmin($scope.accounts[1].value, {from: $scope.data.account.value});
                }).then(function(_trx) {
                    return $scope.contract.getBalance();
                }).then(function(_balance) {
                    $scope.data.contractBalance = parseInt(_balance.toString());
                    return $scope.contract.getInventoryLength();
                }).then(function(_inventoryLength) {
                    var promiseArray = [];
                    for (var i = 0; i < parseInt(_inventoryLength.toString()); i++) {
                        promiseArray.push($scope.contract.inventory(i, {gas: 200000}));
                    }
                    return Promise.all(promiseArray);
                }).then(function(returnedPromiseObjects) {
                    $scope.products = returnedPromiseObjects.map((returnedProduct) => {
                        return {
                            id: parseInt(returnedProduct[0].toString()),
                            price: parseInt(returnedProduct[1].toString()),
                            stock: parseInt(returnedProduct[2].toString()),
                            active: returnedProduct[3]
                        }
                    });
                    $scope.$apply();
                });
            }
        }

        $scope.resetInput = () => {
            $scope.data.priceInput = 0;
            $scope.data.stockInput = 0;
        }

        $scope.activeAccountChanged = function() {
            var promiseArray =  [
                $scope.contract.getOwnerStatus($scope.data.account.value, {from: $scope.data.account.value}),
                $scope.contract.getAdminStatus($scope.data.account.value, {from: $scope.data.account.value})
            ];

            Promise.all(promiseArray).then(function(permissionArray) {
                $scope.data.permissions = {
                    owner: permissionArray[0],
                    admin: permissionArray[1]
                };
                $scope.updateBalance();
                $scope.resetInput();
                $scope.$apply();
            });
        }

        // payment related functions ********************************

        $scope.purchaseWithERC20Token = function(tokenNameParam, productId, amount) {
            let tokenName = tokenNameParam;
            let tokenContract;
            let intBalance;
            let productPrice;
            switch (tokenName) {
                case "testToken":
                    tokenContract = $scope.thirdPartyToken;
                default:
                    tokenContract = $scope.thirdPartyToken;
            }
            $scope.thirdPartyToken.balanceOf(
                $scope.data.account.value,
            {
                from: $scope.owner
            }).then((_balance) => {
                // check to see if they can afford product
                    intBalance = $scope.convertBigNumber(_balance);
                    $scope.data.erc20Balances[tokenName][$scope.data.account.value] = intBalance;
                    productPrice = $scope.products.filter(_product => productId == _product.id)[0].price;
                if (intBalance >= (amount * productPrice)) {
                    $scope.thirdPartyToken.transferFrom(
                        $scope.data.account.value,
                        $scope.owner,
                        productPrice,
                        {
                            from: $scope.data.account.value,
                            gas: 200000
                        }
                    ).then((_trx) => {
                        $scope.updateERC20TokenBalance(tokenName);
                    })
                } else {
                    $scope.$apply();
                }
            });
        };

        $scope.withdrawFunds = function() {
            $scope.contract.withdraw({from: $scope.data.account.value}).then(function(_trx) {
                $scope.data.contractBalance = 0;
                return $scope.updateBalance();
            }).then(()=>{
                $scope.$apply();
            }).catch(function(err) {
                console.log("err", err);
            });
        }

        // product related functions ********************************

        $scope.addProduct = function() {
            const newId = $scope.products.length;
            $scope.contract.addProduct(newId, $scope.data.priceInput, $scope.data.stockInput, {
                from: $scope.data.account.value,
                gas: 200000
            }).then((_trx)=>{
                console.log("trx", _trx)
                $scope.resetInput();
            }).catch((err)=>{
                console.log("err", err);
            });
        }

        $scope.removeProduct = function(productId) {
            $scope.contract.removeProduct(productId, {
                from: $scope.data.account.value,
                gas: 200000
            }).then((_trx)=>{
                console.log("trx", _trx)
                $scope.resetInput();
            }).catch((err)=>{
                console.log("err", err);
            });
        }

        $scope.updateProducts = function() {
            $scope.contract.getInventoryLength().then(function(_inventoryLength) {
                var promiseArray = [];
                for (var i = 0; i < parseInt(_inventoryLength.toString()); i++) {
                    promiseArray.push($scope.contract.inventory(i, {gas: 200000}));
                }
                return Promise.all(promiseArray);
            }).then(function(returnedPromiseObjects) {
                $scope.products = returnedPromiseObjects.map((returnedProduct) => {
                    return {
                        id: parseInt(returnedProduct[0].toString()),
                        price: parseInt(returnedProduct[1].toString()),
                        erc20TokenPrices: {
                            testToken: parseInt(returnedProduct[1].toString())
                        },
                        stock: parseInt(returnedProduct[2].toString()),
                        active: returnedProduct[3]
                    }
                });
                $scope.$apply();
            });
        }

        $scope.buyProduct = function(id, price) {
                $scope.contract.buyProduct(
                    id,
                    {
                        value: price,
                        gas: 100000,
                        from: $scope.data.account.value
                    }
                ).then(function(_trx) {
                    return $scope.contract.getInventoryLength();
                }).then(function(_inventoryLength) {
                    var promiseArray = [];
                    for (var i = 0; i < parseInt(_inventoryLength.toString()); i++) {
                        promiseArray.push($scope.contract.inventory(i, {gas: 200000}));
                    }
                    return Promise.all(promiseArray);
                }).then(function(returnedPromiseObjects) {
                    $scope.products = returnedPromiseObjects.map((returnedProduct) => {
                        return {
                            id: parseInt(returnedProduct[0].toString()),
                            price: parseInt(returnedProduct[1].toString()),
                            stock: parseInt(returnedProduct[2].toString()),
                            active: returnedProduct[3]
                        }
                    });
                    return web3.eth.getBalancePromise($scope.data.account.value)
                }).then(function(balance) {
                    $scope.data.balance = balance.toString();
                    $scope.data.balanceInEth = web3.fromWei(parseInt(balance.toString()), "ether");
                    return $scope.contract.getBalance();
                }).then(function(_balance) {
                    $scope.data.contractBalance = parseInt(_balance.toString());
                    $scope.$apply();
                });
        };
    }]
);
