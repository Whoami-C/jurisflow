import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../backend/src/app.module';

describe('JurisFlow API (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(() => app.close());

  it('confirma PostgreSQL disponível', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200).expect({
      status: 'ok',
      database: 'postgresql',
    });
  });

  it('autentica e protege as rotas', async () => {
    await request(app.getHttpServer()).get('/api/crm').expect(401);
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@jurisflow.local', password: 'JurisFlow@2026' })
      .expect(201);
    token = response.body.accessToken;
    expect(token).toBeTruthy();
    await request(app.getHttpServer())
      .get('/api/crm')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('pré-valida CSV sem persistir linhas inválidas', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/imports/clients/preview')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fileName: 'validacao.csv',
        rows: [
          {
            name: 'Cliente Válido',
            kind: 'INDIVIDUAL',
            document: '529.982.247-25',
            email: 'validacao@jurisflow.test',
          },
          {
            name: '',
            kind: 'INDIVIDUAL',
            email: 'invalido',
          },
        ],
      })
      .expect(201);
    expect(response.body.valid).toBe(1);
    expect(response.body.errors).toEqual([
      { line: 3, message: 'Nome obrigatório' },
    ]);
  });
});
