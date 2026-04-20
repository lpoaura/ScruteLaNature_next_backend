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
  @ApiOperation({ summary: 'Mettre à jour son profil' })
  @ApiResponse({ status: 200, description: 'Profil mis à jour.' })
  updateMe(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.sub || req.user.id, updateUserDto);
  }

  @Delete('users/me')
  @ApiOperation({ summary: 'Bouton RGPD : Supprimer son compte (cascade)' })
  @ApiResponse({ status: 200, description: 'Compte supprimé.' })
  removeMe(@Request() req: any) {
    return this.usersService.remove(req.user.sub || req.user.id);
  }

  @Get('admin/users')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister les employés (Role: ADMIN/SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs.' })
  findAll() {
    return this.usersService.findAll();
  }

  @Post('admin/users')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un compte employé (Role: ADMIN/SUPER_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Employé créé.' })
  createAdmin(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
