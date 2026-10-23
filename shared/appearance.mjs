/** Signature clothes belong to their original wearers in the birthday edition. */
const OWNERS = Object.freeze({
  'g-kurti-jeans': 'birthday',
  'g-starlight-gown': 'birthday',
  'b-kurta-jeans': 'observer',
  'b-celebration': 'observer',
});
const ALIASES = Object.freeze({ 'g-birthday': 'g-starlight-gown', 'g-traveler': 'g-meadow' });
export function canWearPartyOutfit(role, id) {
  return !Object.hasOwn(OWNERS, id) || OWNERS[id] === role;
}
export function partyAvatar(role, id) {
  const avatar = Object.hasOwn(ALIASES, id) ? ALIASES[id] : id;
  if (typeof avatar !== 'string') return 'g-meadow';
  return canWearPartyOutfit(role, avatar) ? avatar : avatar?.startsWith('b-') ? 'b-meadow' : 'g-meadow';
}
