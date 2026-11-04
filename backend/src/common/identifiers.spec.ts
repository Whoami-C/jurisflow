import { isValidCnj, isValidCpfCnpj, onlyDigits } from './identifiers';

describe('Identificadores brasileiros', () => {
  it('normaliza e valida CPF e CNPJ', () => {
    expect(onlyDigits('529.982.247-25')).toBe('52998224725');
    expect(isValidCpfCnpj('529.982.247-25')).toBe(true);
    expect(isValidCpfCnpj('11.111.111/1111-11')).toBe(false);
  });

  it('valida número processual CNJ', () => {
    expect(isValidCnj('0002080-82.2012.5.17.0012')).toBe(true);
    expect(isValidCnj('0002080-99.2012.5.17.0012')).toBe(false);
  });
});
