# Storefront Requirements

- As an administrator, you can add products, which consist of an id, a price and a stock.
- As a regular user you can buy 1 of the products.
- As the owner you can make payments or withdraw value from the contract.

General account information is displayed at the top.
When funds are available to withdraw, the owner can withdraw funds via button in account info.
ERC20 token transactions are immediately added and removed from the token balance, without need to manually withdraw.
User can select active account via select input at top.
Users with appropriate permissions can add products.
Product Lists can display product lists, which have Buy and (with appropriate permissions) Remove buttons.
When product stock runs out or product is removed, buy button is disabled.
Admins can add and remove product inventory as needed.

* Currently needs to be run in incognito due to conflicts with Metamask

## Steps for installation and running

1. Make sure truffle and testrpc are installed.

2.  Run testrpc
    ```javascript
    testrpc
    ```

3. Compile and migrate the contracts.
    ```javascript
    truffle compile
    truffle migrate
    ```

4. Run the webpack server.
    ```javascript
    ./node_modules/.bin/webpack --watch
    ```

5.  The app will be available at localhost:8000

6. The first account will be the owner and admin.  The second account will be admin.  All other accounts do not have
elevated privileges
