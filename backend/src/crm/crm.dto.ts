import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ClientKind,
  OpportunityStage,
  Priority,
  TaskStatus,
} from '@prisma/client';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && !value.trim() ? undefined : value;

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 200;
}

export class ClientDto {
  @IsEnum(ClientKind)
  kind!: ClientKind;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(30)
  document?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail({}, { message: 'O e-mail informado é inválido.' })
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class OpportunityDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  clientId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  contact?: string;

  @IsString()
  @MaxLength(50)
  area!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  source?: string;

  @IsEnum(OpportunityStage)
  stage!: OpportunityStage;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimatedValueCents!: number;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(300)
  nextAction?: string;
}

export class MatterDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  clientId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(40)
  number?: string;

  @IsString()
  @MaxLength(50)
  area!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  court?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(30)
  side?: string;

  @IsString()
  @MaxLength(50)
  stage!: string;

  @IsString()
  @MaxLength(30)
  status!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  valueCents!: number;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(1500)
  notes?: string;
}

export class TaskDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  matterId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsDateString({}, { message: 'Informe uma data válida.' })
  dueDate!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(5)
  dueTime?: string;

  @IsString()
  @MaxLength(40)
  type!: string;

  @IsEnum(Priority)
  priority!: Priority;

  @IsEnum(TaskStatus)
  status!: TaskStatus;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(100)
  assignee?: string;
}

export class TaskStatusDto {
  @IsEnum(TaskStatus)
  status!: TaskStatus;
}

export class OpportunityStageDto {
  @IsEnum(OpportunityStage)
  stage!: OpportunityStage;
}

export class CsvClientRowDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsEnum(ClientKind)
  kind!: ClientKind;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(30)
  document?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(50)
  opportunityArea?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(80)
  opportunitySource?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  opportunityValueCents?: number;
}

export class ImportClientsDto {
  @IsString()
  @MaxLength(180)
  fileName!: string;

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CsvClientRowDto)
  rows!: CsvClientRowDto[];
}
