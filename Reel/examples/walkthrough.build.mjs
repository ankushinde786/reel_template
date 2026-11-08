// Long-code reel: files as tabs, scroll bar, highlighted ranges, function breadcrumb, real output.   node examples/walkthrough.build.mjs --voice mock
import { buildReel } from "../engine/index.mjs";
const main = `from shop import Cart, apply_discount

def main():
    cart = Cart()
    cart.add("book", 12.5, qty=2)
    cart.add("pen", 1.2, qty=10)
    cart.add("lamp", 30)
    subtotal = cart.total()
    print(f"Subtotal: {subtotal:.2f}")
    final = apply_discount(subtotal, code="SAVE10")
    print(f"Final:    {final:.2f}")

if __name__ == "__main__":
    main()
`;
const shop = `"""A tiny shopping cart."""

DISCOUNTS = {"SAVE10": 0.10, "HALF": 0.50}

class Cart:
    def __init__(self):
        self.items = []

    def add(self, name, price, qty=1):
        if price <= 0:
            raise ValueError("price must be positive")
        self.items.append({"name": name, "price": price, "qty": qty})

    def total(self):
        return sum(i["price"] * i["qty"] for i in self.items)

    def count(self):
        return sum(i["qty"] for i in self.items)

    def names(self):
        return [i["name"] for i in self.items]

def apply_discount(amount, code=None):
    rate = DISCOUNTS.get(code, 0)
    return amount * (1 - rate)
`;
buildReel({
  id: "ex-walkthrough", type: "walkthrough", title: "Reading a Python Project", countLabel: "parts",
  intro: { cap: ["Reading a project,", "file by file."], say: "Reading a real Python project, file by file." },
  steps: [{
    name: "Shop", title: "Shopping cart project", files: [{ name: "main.py", code: main }, { name: "shop.py", code: shop }], entry: "main.py",
    beats: [
      { file: "main.py", lines: [1, 1], cap: ["main.py imports", "from shop.py."], note: "main.py imports Cart and apply_discount from shop.py", say: "The entry point imports a Cart class and a discount function from the second file." },
      { file: "main.py", lines: [4, 8], cap: ["Build a cart,", "ask for the total."], note: "Create a cart, add items, ask for the total", say: "It creates a cart, adds three items, and asks for the total." },
      { file: "shop.py", lines: [5, 7], cap: ["Cart starts with", "an empty list."], note: "The Cart starts with an empty list of items", say: "Over in shop dot py, the cart starts with an empty list." },
      { file: "shop.py", lines: [9, 12], cap: ["add() rejects", "bad prices."], note: "add() rejects prices that are not positive", say: "The add method rejects any price that is not positive." },
      { file: "shop.py", lines: [14, 15], cap: ["total() sums", "price x quantity."], note: "total() sums price times quantity", say: "Total sums price times quantity for every item." },
      { file: "shop.py", lines: [23, 25], cap: ["Discount codes", "look up a rate."], note: "A discount code looks up a rate, default 0", say: "Finally, a discount code looks up a rate. Unknown codes mean no discount." },
      { file: "main.py", lines: [9, 11], cap: ["Run it and see", "the result."], note: "Run it", run: true, say: "Run it, and you get the subtotal and the discounted price." },
    ],
  }],
  outro: { cap: ["Follow Coding Archives", "for more Python!"], say: "Follow Coding Archives for more Python!" },
});
