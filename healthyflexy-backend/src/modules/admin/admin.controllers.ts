import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ErrorCode } from '../../common/constants';
import { AppException } from '../../common/exceptions/app.exception';
import { AppConfigService } from '../app-config/app-config.service';
import { Public } from '../auth/decorators/public.decorator';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminUsersService } from './admin-users.service';
import { AdminGuard } from './admin.guard';
import {
  AdminLoginDto,
  AdminRefreshDto,
  AdminUpdateUserDto,
  AnalyticsQueryDto,
  BlockUserDto,
  CreateExerciseDto,
  CreateProgramDto,
  THEME_KEYS,
  UpdateAppConfigDto,
  UpdateExerciseDto,
  UpdateProgramDto,
  UsersQueryDto,
} from './dto/admin.dto';

/**
 * CRM API (/admin/*). Користувацький JwtAuthGuard пропускає ці маршрути (@Public),
 * натомість діє AdminGuard з окремим адмін-токеном.
 */
@ApiTags('admin')
@Public()
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AdminLoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: AdminRefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  me() {
    return { email: this.auth.email };
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Public()
@UseGuards(AdminGuard)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analytics: AdminAnalyticsService) {}

  @Get()
  overview(@Query() query: AnalyticsQueryDto) {
    return this.analytics.overview(query.days);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Public()
@UseGuards(AdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list(@Query() query: UsersQueryDto) {
    return this.users.list(query);
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.detail(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminUpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Post(':id/block')
  @HttpCode(HttpStatus.OK)
  block(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BlockUserDto) {
    return this.users.setBlocked(id, dto.blocked);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.remove(id);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Public()
@UseGuards(AdminGuard)
@Controller('admin/exercises')
export class AdminExercisesController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get()
  list() {
    return this.catalog.listExercises();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.getExercise(id);
  }

  @Post()
  create(@Body() dto: CreateExerciseDto) {
    return this.catalog.createExercise(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateExerciseDto) {
    return this.catalog.updateExercise(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.removeExercise(id);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Public()
@UseGuards(AdminGuard)
@Controller('admin/programs')
export class AdminProgramsController {
  constructor(
    private readonly catalog: AdminCatalogService,
    private readonly appConfig: AppConfigService,
  ) {}

  @Get()
  list() {
    return this.catalog.listPrograms();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.getProgram(id);
  }

  @Post()
  async create(@Body() dto: CreateProgramDto) {
    await this.assertLimit(dto.exercises.length);
    return this.catalog.createProgram(dto);
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProgramDto) {
    if (dto.exercises) await this.assertLimit(dto.exercises.length);
    return this.catalog.updateProgram(id, dto);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id', ParseUUIDPipe) id: string, @Body() body: { archived?: boolean }) {
    return this.catalog.setArchived(id, body.archived !== false);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.removeProgram(id);
  }

  private async assertLimit(count: number) {
    const { maxProgramExercises } = await this.appConfig.limits();
    if (count > maxProgramExercises) {
      throw new AppException(
        ErrorCode.PROGRAM_TOO_MANY_EXERCISES,
        HttpStatus.UNPROCESSABLE_ENTITY,
        `Максимум ${maxProgramExercises} упражнений в программе (меняется в «Лимитах»)`,
      );
    }
  }
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const CONTENT_KEY = /^[a-zA-Z0-9_.]{1,120}$/;
const LANGS = ['uk', 'ru', 'pl', 'en'];

@ApiTags('admin')
@ApiBearerAuth()
@Public()
@UseGuards(AdminGuard)
@Controller('admin/app-config')
export class AdminAppConfigController {
  constructor(private readonly appConfig: AppConfigService) {}

  @Get()
  get() {
    return this.appConfig.get();
  }

  @Put()
  update(@Body() dto: UpdateAppConfigDto) {
    const theme =
      dto.theme === undefined || dto.theme === null
        ? dto.theme
        : { presetId: dto.theme.presetId, colors: this.cleanColors(dto.theme.colors) };
    const content = dto.content === undefined ? undefined : this.cleanContent(dto.content);
    return this.appConfig.update({ theme, content, limits: dto.limits });
  }

  /** Лише відомі токени й #RRGGBB — щоб зламаний колір не «покласти» застосунок */
  private cleanColors(colors: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const key of THEME_KEYS) {
      const value = colors[key];
      if (value === undefined) continue;
      if (typeof value !== 'string' || !HEX.test(value))
        this.invalid(`Цвет ${key}: ожидается #RRGGBB`);
      out[key] = value.toUpperCase();
    }
    return out;
  }

  private cleanContent(content: Record<string, Record<string, string>>) {
    const out: Record<string, Record<string, string>> = {};
    for (const [lang, texts] of Object.entries(content)) {
      if (!LANGS.includes(lang)) this.invalid(`Неизвестный язык ${lang}`);
      if (typeof texts !== 'object' || texts === null)
        this.invalid(`Тексты ${lang}: ожидается объект`);
      const clean: Record<string, string> = {};
      for (const [key, value] of Object.entries(texts)) {
        if (!CONTENT_KEY.test(key)) this.invalid(`Некорректный ключ текста ${key}`);
        if (typeof value !== 'string') this.invalid(`Текст ${key}: ожидается строка`);
        if (value.length > 2000) this.invalid(`Текст ${key}: слишком длинный`);
        // порожнє значення = стандартний текст застосунку
        if (value.trim()) clean[key] = value;
      }
      if (Object.keys(clean).length > 0) out[lang] = clean;
    }
    return out;
  }

  private invalid(message: string): never {
    throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, message);
  }
}
