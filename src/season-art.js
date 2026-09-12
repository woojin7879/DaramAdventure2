export function seasonLayers(season,time,duration) {
  const blend=season===0?1:Math.min(1,Math.max(0,(time-season*duration)/6));
  return {from:Math.max(0,season-1),to:season,blend};
}
export function groundFrame(image,season) {
  const w=image.width/2,h=image.height/2;
  return [(season%2)*w,Math.floor(season/2)*h,w,h];
}
export function sceneryFrame(image,sprite,season) {
  const w=image.width/6,h=image.height/4;
  return [(sprite-12)*w,season*h,w,h];
}
// The generated sheet has slightly uneven row spacing; calibrated source cuts
// prevent neighboring-season pixels and keep each object's feet on its world anchor.
const rowCuts=[0,267,518,766,1024];
const feet=[[260,262,264,264,262,266],[243,251,246,250,246,251],[242,246,245,248,247,248],[239,243,237,237,237,242]];
export function sceneryPlacement(sprite,season,size) {
  const col=sprite-12,top=rowCuts[season]+3,bottom=rowCuts[season+1]-2;
  return {source:[col*256+3,top,250,bottom-top],left:-size/2+3*size/256,top:-(feet[season][col]-3)*size/256,width:250*size/256,height:(bottom-top)*size/256};
}
