import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanText, validEmail, validIsoDate } from '../lib/validation.ts';

void test('normaliza e limita textos recebidos', () => {
  assert.equal(cleanText('  Cliente Jurídico  ', 10), 'Cliente Ju');
  assert.equal(cleanText({ nome: 'objeto inválido' }), '');
});

void test('valida e-mails sem aceitar formatos incompletos', () => {
  assert.equal(validEmail('advogado@escritorio.com.br'), true);
  assert.equal(validEmail('email-invalido'), false);
  assert.equal(validEmail(''), true);
});

void test('aceita somente datas ISO válidas', () => {
  assert.equal(validIsoDate('2026-09-12'), true);
  assert.equal(validIsoDate('12/09/2026'), false);
  assert.equal(validIsoDate('data'), false);
});
