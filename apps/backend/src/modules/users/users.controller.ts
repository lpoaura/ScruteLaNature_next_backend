import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('users/me')
  @ApiOperation({ summary: 'Récupérer le profil courant' })
  @ApiResponse({ status: 200, description: 'Le profil utilisateur.' })
  findMe(@Request() req: any) {
    return this.usersService.findOne(req.user.sub || req.user.id);
  }

  @Patch('users/me')
  @ApiOperation({ summary: 'Mettre à jour son profil (prénom, pseudo, pushToken, analyticsConsent)' })
  @ApiResponse({ status: 200, description: 'Profil mis à jour.' })
  updateMe(@Request() req: any, @Body() dto: UpdateMeDto) {
    return this.usersService.update(req.user.sub || req.user.id, dto);
  }

  @Delete('users/me')
  @ApiOperation({ summary: 'Bouton RGPD : Supprimer son compte (cascade)' })
  @ApiResponse({ status: 200, description: 'Compte supprimé.' })
  removeMe(@Request() req: any) {
    return this.usersService.remove(req.user.sub || req.user.id);
  }

  @Post('users/me/change-password')
  @ApiOperation({ summary: 'Changer son mot de passe (ancien mdp requis)' })
  @ApiResponse({ status: 200, description: 'Mot de passe modifié.' })
  @ApiResponse({ status: 401, description: 'Mot de passe actuel incorrect.' })
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(
      req.user.sub || req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Get('admin/users')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister les employés de son organisme (ADMIN) ou tous (SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs.' })
  findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.role, req.user.organismeId ?? null);
  }

  @Delete('admin/users/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprimer un compte employé (ADMIN/SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Compte supprimé.' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  removeById(@Param('id') id: string) {
    return this.usersService.removeById(id);
  }

  @Post('admin/users')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un compte employé (Role: ADMIN/SUPER_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Employé créé.' })
  createAdmin(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
