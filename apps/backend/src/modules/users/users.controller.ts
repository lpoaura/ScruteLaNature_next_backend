import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Créer un nouvel utilisateur' })
  @ApiResponse({
    status: 201,
    description: "L'utilisateur a été créé avec succès.",
  })
  @ApiResponse({
    status: 400,
    description: 'Requête invalide (erreur de validation).',
  })
  @ApiResponse({
    status: 409,
    description: 'Un utilisateur avec cet email existe déjà.',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Récupérer tous les utilisateurs (Role: ADMIN)' })
  @ApiResponse({ status: 200, description: 'Liste de tous les utilisateurs.' })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé. Rôle administrateur requis.',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un utilisateur par son ID' })
  @ApiParam({
    name: 'id',
    description: "ID de l'utilisateur (UUID)",
    type: String,
  })
  @ApiResponse({ status: 200, description: "L'utilisateur trouvé." })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  @ApiParam({
    name: 'id',
    description: "ID de l'utilisateur (UUID)",
    type: String,
  })
  @ApiResponse({ status: 200, description: "L'utilisateur a été mis à jour." })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé.' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer un utilisateur (Role: ADMIN)' })
  @ApiParam({
    name: 'id',
    description: "ID de l'utilisateur (UUID)",
    type: String,
  })
  @ApiResponse({ status: 200, description: "L'utilisateur a été supprimé." })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé. Rôle administrateur requis.',
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé.' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
