import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import {
  ClientDto,
  ImportClientsDto,
  MatterDto,
  OpportunityDto,
  OpportunityStageDto,
  SearchQueryDto,
  TaskDto,
  TaskStatusDto,
} from './crm.dto';
import { CrmService } from './crm.service';

@Controller()
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('crm')
  dashboard(
    @Query() query: SearchQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.dashboard(query, user);
  }

  @Post('clients')
  createClient(@Body() input: ClientDto, @CurrentUser() user: AuthenticatedUser) {
    return this.crm.createClient(input, user);
  }

  @Put('clients/:id')
  updateClient(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ClientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.updateClient(id, input, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Delete('clients/:id')
  deleteClient(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.deleteClient(id, user);
  }

  @Post('opportunities')
  createOpportunity(
    @Body() input: OpportunityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.createOpportunity(input, user);
  }

  @Put('opportunities/:id')
  updateOpportunity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: OpportunityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.updateOpportunity(id, input, user);
  }

  @Patch('opportunities/:id/stage')
  moveOpportunity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: OpportunityStageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.moveOpportunity(id, input.stage, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Delete('opportunities/:id')
  deleteOpportunity(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.deleteOpportunity(id, user);
  }

  @Post('matters')
  createMatter(@Body() input: MatterDto, @CurrentUser() user: AuthenticatedUser) {
    return this.crm.createMatter(input, user);
  }

  @Put('matters/:id')
  updateMatter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: MatterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.updateMatter(id, input, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Delete('matters/:id')
  deleteMatter(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.deleteMatter(id, user);
  }

  @Post('tasks')
  createTask(@Body() input: TaskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.crm.createTask(input, user);
  }

  @Put('tasks/:id')
  updateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: TaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.updateTask(id, input, user);
  }

  @Patch('tasks/:id/status')
  moveTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: TaskStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.moveTask(id, input.status, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Delete('tasks/:id')
  deleteTask(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.deleteTask(id, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Post('imports/clients/preview')
  previewClients(@Body() input: ImportClientsDto) {
    return this.crm.previewClientImport(input);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Post('imports/clients')
  importClients(
    @Body() input: ImportClientsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.importClients(input, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Post('demo')
  demo(@CurrentUser() user: AuthenticatedUser) {
    return this.crm.demo(user);
  }

  @Roles(Role.ADMIN)
  @Get('audit')
  audit() {
    return this.crm.auditLog();
  }

  @Roles(Role.ADMIN)
  @Get('users/summary')
  users() {
    return this.crm.userSummary();
  }
}
