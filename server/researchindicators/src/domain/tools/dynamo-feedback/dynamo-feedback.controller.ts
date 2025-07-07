import { Controller, Get, Post, Body, Patch, Param, Delete, HttpStatus } from '@nestjs/common';
import { DynamoFeedbackService } from './dynamo-feedback.service';
import { CreateDynamoFeedbackDto } from './dto/create-dynamo-feedback.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Dynamo Feedback')
@ApiBearerAuth()
@Controller()
export class DynamoFeedbackController {
  constructor(private readonly dynamoFeedbackService: DynamoFeedbackService) {}

  @ApiOperation({ summary: 'Save feedback to DynamoDB' })
  @Post('save-data')
  @ApiBody({
    type: CreateDynamoFeedbackDto,
    examples: {
      example1: {
        summary: 'Ejemplo de feedback completo',
        value: {
          user: {
            sec_user_id: 123,
            first_name: 'Juan',
            last_name: 'Pérez',
            email: 'juan.perez@example.com',
            user_role_list: [
              {
                created_at: '2025-07-07T14:30:00.000Z',
                updated_at: '2025-07-07T15:00:00.000Z',
                is_active: true,
                sec_user_role_id: 1,
                user_id: 123,
                role_id: 2,
                role: {
                  created_at: '2025-01-01T08:00:00.000Z',
                  updated_at: '2025-06-01T12:00:00.000Z',
                  is_active: true,
                  justification_update: null,
                  sec_role_id: 2,
                  name: 'Editor',
                  focus_id: 5
                }
              }
            ],
            roleName: 'Editor'
          },
          description: 'El sistema presenta errores al guardar el formulario.',
          issueType: 1,
          feedbackType: 'Bug',
          text: "Al presionar el botón 'Guardar', aparece un error 500 en consola."
        }
      }
    }
  })
  async saveData(@Body() body: CreateDynamoFeedbackDto) {
    return await this.dynamoFeedbackService.saveData(body).then((response) => 
      ResponseUtils.format({
        description: 'Feedback saved successfully',
        status: HttpStatus.OK,
        data: response,
      }),
    );
  }

  @Get('test-data')
  getAllFeedback() {
    return this.dynamoFeedbackService.getAllFeedback();
  }

}
