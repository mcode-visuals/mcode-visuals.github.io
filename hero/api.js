/* Hero animation registry. Loaded first; every file in variants/ calls HERO.register(...).
   You normally never edit this file. */
window.HERO = {
  variants: {},          // name -> { factory, label }
  order: [],             // display order in the picker
  register(name, factory, label) {
    if (!this.variants[name]) this.order.push(name);
    this.variants[name] = { factory, label: label || name };
  },
};
