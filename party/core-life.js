/** Party navigation opens the original UI; it never runs a second set of game rules. */
export class CoreLife {
  constructor(game, closePartyPanel) { this.game=game; this.core=game.core; this.closePartyPanel=closePartyPanel; }
  get st() { return this.core.st; }
  get guide() { return this.core.guide; }
  get van() { return this.core.van; }
  get housing() { return this.core.housing; }
  get interior() { return this.core.inVan || this.core.inHouse; }
  get view() {
    if (this.core.inVan) return {scene:this.core.van.scene,camera:this.core.van.camera};
    if (this.core.inHouse) return {scene:this.core.house.scene,camera:this.core.house.camera};
    return this.core.cutscene?.view || null;
  }
  open(tab = 'journal') {
    if (this.core.readOnly) return;
    this.closePartyPanel();
    const panels={craft:'bag',trade:'market',friends:'messages',home:'homes',rides:'vehicles',company:'journal'};
    if (tab==='van') { this.core.enterVan(); return; }
    this.core.ui.open(panels[tab] || tab);
  }
  closeInterior() { if(this.core.inVan)this.core.exitVan(); if(this.core.inHouse)this.core.exitHouse(); }
  interact() { if(this.core.readOnly || !this.core.target)return false; this.core.interact(this.core.target); return true; }
  hint() { return this.core.target?.label || ''; }
  save() { this.core.save(); }
  destroy() { this.core.save(); document.getElementById('ui')?.remove(); }
}
