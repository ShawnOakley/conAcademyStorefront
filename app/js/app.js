require("file-loader?name=../index.html!../index.html");
const Web3 = require("web3");
const angular = require("angular");
const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
const $ = require("jquery");
const storeFrontJson = require("../../build/contracts/StoreFront.json");
const erc20TokenContractJson = require("../../build/contracts/ERC20TokenContract.json");
const affiliateMerchantHubJson = require("../../build/contracts/affiliateMerchantHub.json");

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

const AffiliateMerchantHub = truffleContract(affiliateMerchantHubJson);
AffiliateMerchantHub.setProvider(web3.currentProvider);


const ethToTestCoinConversionRate = 2;

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
            erc20Balances: {},
            toggleState: {
                homeMerchant: true
            },
            affiliateMerchants: {}
       };

        const deploymentPromises = Promise.all([
            Storefront.deployed(),
            ERC20TokenContract.deployed(),
            AffiliateMerchantHub.deployed()
        ])
        deploymentPromises
            .then(function(_instance) {
                $scope.contract = _instance[0];
                $scope.thirdPartyToken = _instance[1];
                $scope.affiliateMerchantHub = _instance[2];
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
//return $scope.affiliateMerchantHub.getAffiliateMerchantsCount()
//            .then(function(_affiliateMerchantLength){
//                console.log("this", $scope.convertBigNumber(_affiliateMerchantLength));
//                if ($scope.convertBigNumber(_affiliateMerchantLength) === 0) {
//                    $scope.affiliateMerchantHub.createAffiliateMerchant(
//                        "testMerchant",
//                        {
//                            from: accounts[0],
//                            gas: 1000000
//                        });
//                }
////                $scope.constructAffiliateMerchants();
//                $scope.$apply();
//            })

            $scope.updateBalance();
            $scope.getInitialInfo();
            $scope.$apply();
        }.bind(this))

       // helper functions ********************************

        /*
        Converts big number to int for parsing contractual returned values
        */

        $scope.convertBigNumber = (bigNumber) => {
            return parseInt(bigNumber.toString());
        };

        // update scope variables functions ********************************

        /*
        Generates affiliate merchant structure
        */

        $scope.constructAffiliateMerchants = function() {
            $scope.affiliateMerchantHub.getAffiliateMerchantsCount().then((_affiliateMerchantsLength)=>{
                let merchantRequestArray = [];
                    console.log($scope.convertBigNumber(_affiliateMerchantsLength))
                for (var i = 0; i<_affiliateMerchantsLength; i++) {
                    merchantRequestArray.push($scope.affiliateMerchantHub.getAffiliateMerchant(i));
                }

                Promise.all(merchantRequestArray).then((returnedMerchantObjects)=>{
                    console.log("merchants", returnedMerchantObjects);
                    return $scope.affiliateMerchantHub.addAffiliateMerchantProduct(0, {gas: 200000});
                }).then((_inventoryLength) => {
                    return $scope.affiliateMerchantHub.getAffiliateMerchantInventoryLength(0);
                }).then((_inventoryLength) => {
                      console.log("_inventoryLength", $scope.convertBigNumber(_inventoryLength));
                      return $scope.affiliateMerchantHub.getAffiliateMerchantInventoryLength(0);
                  });
            })
        }

        /*
        Updates balance and applies to scope
        */

        $scope.updateBalance = function() {
            return web3.eth.getBalancePromise($scope.data.account.value).then(function(balance) {
                $scope.data.balance = balance.toString();
                $scope.data.balanceInEth = web3.fromWei(parseInt(balance.toString()), "ether");
                $scope.$apply();
            });
        }

        /*
        Updates erc20 token balance by name of token and applies to scope
        */

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
                $scope.data.erc20Balances[tokenName][$scope.data.account.value] = $scope.convertBigNumber(_erc20Balance);
                $scope.$apply();
            })
        }

        /*
        Gets initial info from contract and applies to scope
        */

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

        /*
        Resets input values
        */

        $scope.resetInput = () => {
            $scope.data.priceInput = 0;
            $scope.data.stockInput = 0;
        }

        /*
        Gets new info for scope based on new account number
        */

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
                $scope.updateERC20TokenBalance("testToken");
                $scope.$apply();
            });
        }

        // payment related functions ********************************

        /*
        Purchase with ERC20 token
        */

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
                productPrice = $scope.products.filter(_product => productId == _product.id)[0].price  * ethToTestCoinConversionRate;
                if (intBalance >= (amount * productPrice)) {
                    $scope.thirdPartyToken.transferFrom(
                        $scope.data.account.value,
                        $scope.owner,
                        amount * productPrice,
                        {
                            from: $scope.data.account.value,
                            gas: 200000
                        }
                    ).then((_trx) => {
                        $scope.updateERC20TokenBalance(tokenName);
                        $scope.adjustProductInventory(productId, -amount);
                        $scope.$apply();
                    })
                } else {
                    $scope.$apply();
                }
            });
        };

        /*
        Withdraw funds
        */

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

        /*
        Adjusts product inventory, for use with erc20 purchases
        */

        $scope.adjustProductInventory = function(productId, amount) {
            $scope.contract.adjustProductInventory(productId, amount, {
                from: $scope.owner,
                gas: 200000
            }).then((_trx)=>{
                $scope.updateProduct(productId);
            }).catch((err)=>{
                console.log("err", err);
            });
        }

        /*
        Adds product
        */

        $scope.addProduct = function() {
            const newId = $scope.products.length;
            $scope.contract.addProduct(newId, $scope.data.priceInput, $scope.data.stockInput, {
                from: $scope.data.account.value,
                gas: 200000
            }).then((_trx)=>{
                console.log("trx", _trx)
                $scope.resetInput();
                $scope.$apply();
            }).catch((err)=>{
                console.log("err", err);
            });
        }

        /*
        Toggles show of products based on merchant name
        */

        $scope.toggleShow = function(merchantName) {
            $scope.data.toggleState[merchantName] = !$scope.data.toggleState[merchantName];
        }

        /*
        Removes product
        */

        $scope.removeProduct = function(productId) {
            $scope.contract.removeProduct(productId, {
                from: $scope.data.account.value,
                gas: 200000
            }).then((_trx)=>{
                $scope.resetInput();
                $scope.updateProduct(productId);
                $scope.$apply();
            }).catch((err)=>{
                console.log("err", err);
            });
        }

        /*
        Reactivates product
        */

        $scope.reactivateProduct = function(productId) {
            $scope.contract.reactivateProduct(productId, {
                from: $scope.data.account.value,
                gas: 200000
            }).then((_trx)=>{
                $scope.resetInput();
                $scope.updateProduct(productId);
                $scope.$apply();
            }).catch((err)=>{
                console.log("err", err);
            });
        }

        /*
        Updates product
        */

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
                        stock: parseInt(returnedProduct[2].toString()),
                        active: returnedProduct[3]
                    }
                });
                $scope.$apply();
            });
        }

        /*
        Update product
        */

        $scope.updateProduct = function(index) {
            $scope.contract.inventory(index, {gas: 200000}).then(function(returnedItem) {
                $scope.products[index] = {
                    id: parseInt(returnedItem[0].toString()),
                    price: parseInt(returnedItem[1].toString()),
                    stock: parseInt(returnedItem[2].toString()),
                    active: returnedItem[3]
                }
                $scope.$apply();
            });
        }

        /*
        Buys product with ether
        */

        $scope.buyProduct = function(id, price) {
                $scope.contract.buyProduct(
                    id,
                    {
                        value: price,
                        gas: 100000,
                        from: $scope.data.account.value
                    }
                ).then(function(_trx) {
                    return web3.eth.getBalancePromise($scope.data.account.value)
                }).then(function(balance) {
                    $scope.data.balance = balance.toString();
                    $scope.data.balanceInEth = web3.fromWei(parseInt(balance.toString()), "ether");
                    return $scope.contract.getBalance();
                }).then(function(_balance) {
                    $scope.data.contractBalance = parseInt(_balance.toString());
                    $scope.updateProduct(id);
                    $scope.$apply();
                });
        };
    }]
);
