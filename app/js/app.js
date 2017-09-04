require("file-loader?name=../index.html!../index.html");

const Web3 = require("web3");
const angular = require("angular");
const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
const $ = require("jquery");
const storeFrontJson = require("../../build/contracts/StoreFront.json");
console.log("Angular", angular);
if (typeof web3 !== "undefined") {
    window.web3 = new Web3(web3.currentProvider);
} else {
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.version, { suffix: "Promise" });

const Storefront = truffleContract(storeFrontJson);
Storefront.setProvider(web3.currentProvider);

const storefrontApp = angular.module("storefrontApp", []);
storefrontApp.controller("StorefrontController",
    ["$scope","$location","$http","$q","$window","$timeout",
    function($scope, $location, $http, $q, $timeout) {
       $scope.data = {
            account: null,
            permissions: {
                owner: false,
                admin: false
            }
       };
        Storefront.deployed()
            .then(function(_instance) {
                $scope.contract = _instance;
                $scope.$apply();
            }.bind(this));

        web3.eth.getAccountsPromise().then(function(accounts) {
            if (accounts && accounts.length > 0) {
                $scope.data.account = { label: accounts[0], value: accounts[0]};
                $scope.accounts = accounts.map((account) => {
                    return {label: account, value: account}
                });
            }
            $scope.updateBalance();
        }.bind(this))

        $scope.updateBalance = function() {
            web3.eth.getBalancePromise($scope.data.account.value).then(function(balance) {
                $scope.balance = balance.toString();
                $scope.balanceInEth = web3.fromWei(parseInt(balance.toString()), "ether");
                $scope.getInitialInfo();
                $scope.$apply();
            });
        }

        $scope.activeAccountChanged = function() {
            console.log("account", $scope.data.account);
            var promiseArray =  [
                $scope.contract.getOwnerStatus($scope.data.account.value, {from: $scope.data.account.value}),
                $scope.contract.getAdminStatus($scope.data.account.value, {from: $scope.data.account.value})
            ];

            Promise.all(promiseArray).then(function(permissionArray) {
                console.log("account", permissionArray);
                $scope.data.permissions = {
                    owner: permissionArray[0],
                    admin: permissionArray[1]
                };
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
                    $scope.balance = balance.toString();
                    $scope.balanceInEth = web3.fromWei(parseInt(balance.toString()), "ether");
                    $scope.$apply();
                });
        };
        $scope.getInitialInfo = function() {
            if ($scope.contract && $scope.data.account.value) {
                $scope.contract.addAdmin($scope.data.account.value, {from: $scope.data.account.value}).then(function(_trx) {
                    return $scope.contract.addAdmin($scope.accounts[1].value, {from: $scope.data.account.value});
                }).then(function(_trx) {
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
    }]
);
