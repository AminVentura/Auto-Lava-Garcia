import { describe, expect, it } from 'vitest';
import { bytesDeWebp, fotoPublica, idPlato, urlFotoPlato } from '../lib/menuFoto';

describe('foto de plato', () => {
  it('solo acepta la dirección pública del plato', () => {
    expect(idPlato('jugos-naturales')).toBe('jugos-naturales');
    expect(idPlato('../secreto')).toBeNull();
    expect(fotoPublica(urlFotoPlato('jugos-naturales'))).toBe('https://antojosbarlounge.com/menu-fotos/jugos-naturales.webp');
    expect(fotoPublica('https://evil.example/menu-fotos/jugos-naturales.webp')).toBeNull();
  });

  it('rechaza un archivo que no es webp', () => {
    expect(bytesDeWebp('data:image/jpeg;base64,aaaa')).toBeNull();
    const falso = Buffer.from('no-es-webp');
    expect(bytesDeWebp(`data:image/webp;base64,${falso.toString('base64')}`)).toBeNull();
  });
});
