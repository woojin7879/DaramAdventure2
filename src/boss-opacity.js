// Remove only near-black pixels connected to each frame's exterior.
// Dark scales/bark enclosed inside the silhouette stay opaque.
export function clearBlackMatte(data,width,height,columns=4,rows=2) {
  const visited=new Uint8Array(width*height),queue=new Int32Array(width*height);
  const dark=(n)=>Math.max(data[n*4],data[n*4+1],data[n*4+2])<=20;
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++) {
    const x0=Math.floor(col*width/columns),x1=Math.floor((col+1)*width/columns)-1;
    const y0=Math.floor(row*height/rows),y1=Math.floor((row+1)*height/rows)-1;
    let head=0,tail=0;
    const add=n=>{if(!visited[n]&&dark(n)){visited[n]=1;queue[tail++]=n;}};
    for(let x=x0;x<=x1;x++){add(y0*width+x);add(y1*width+x);}
    for(let y=y0;y<=y1;y++){add(y*width+x0);add(y*width+x1);}
    while(head<tail) {
      const n=queue[head++],x=n%width,y=Math.floor(n/width);
      data[n*4+3]=0;
      if(x>x0)add(n-1);if(x<x1)add(n+1);
      if(y>y0)add(n-width);if(y<y1)add(n+width);
    }
  }
}
export function opaqueBossAtlas(image, columns=4, rows=2) {
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
  const pixels=c.getImageData(0,0,canvas.width,canvas.height);
  clearBlackMatte(pixels.data,canvas.width,canvas.height,columns,rows);
  c.putImageData(pixels,0,0);return canvas;
}
