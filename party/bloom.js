/** Keep isolated invalid HDR fragments from spreading across the bloom mip chain.
 * Three r180 uses WebGL2, so its shader materials support isnan/isinf.
 * Every finite colour and the original bloom settings pass through unchanged.
 */
export function stabilizeBloom(bloom) {
  const filter = bloom.materialHighPassFilter;
  const sample = 'vec4 texel = texture2D( tDiffuse, vUv );';
  if (!filter.fragmentShader.includes(sample)) throw new Error('Unexpected bloom high-pass shader.');
  filter.fragmentShader = filter.fragmentShader.replace(sample, `${sample}
      if (any(isnan(texel)) || any(isinf(texel))) texel = vec4(0.0);`);
  filter.needsUpdate = true;
}
