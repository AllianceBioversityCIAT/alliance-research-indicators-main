import { MigrationInterface, QueryRunner } from 'typeorm';
import { TemplateEnum } from '../../domain/shared/auxiliar/template/enum/template.enum';

export class InsertTemplates1751474908040 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(` delete from \`sec_template\``);
    await queryRunner.query(` insert into \`sec_template\` (\`name\`, \`template\` ) values
            ('${TemplateEnum.WELCOME_EMAIL}', '<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Document</title>

                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                    <link
                    href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
                    rel="stylesheet"
                    />
                    <link
                    href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap"
                    rel="stylesheet"
                    />
                    <style>
                    footer table {
                        padding: 0px 100px;
                        box-sizing: border-box;
                    }
                    @media only screen and (max-width: 700px) {
                        footer table {
                        padding: 0px 0px;
                        }
                    }
                    </style>
                </head>

                <body>
                    <article style="font-family: Barlow, sans-serif; padding: 0px 50px">
                    <table
                        style="width: 100%; height: 100%; border: none; position: relative"
                    >
                        <tr>
                        <td align="center" valign="middle">
                            <img
                            style="height: 70px; margin-top: 30px; margin-bottom: 20px"
                            src="https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/alliance-logo-color.png"
                            alt=""
                            />
                        </td>
                        </tr>
                    </table>

                    <div style="background: #f4f7f9; border: 1px solid #b0c4dd91">
                        <div
                        style="
                            width: 100%;
                            height: 100%;
                            border: none;
                            background-image: url(https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/email-image-header-bg.png);
                            background-size: cover;
                            background-position: center;
                            padding-top: 40px;
                            padding-bottom: 40px;
                        "
                        >
                        <div style="color: white; font-weight: 700; text-align: center">
                            <h1 style="margin: 0; padding: 0">WELCOME TO THE</h1>
                            <h2 style="margin: 0; padding: 0; color: #d3e7d5">
                            Alliance Reporting System
                            </h2>
                        </div>
                        </div>

                        <div
                        class="main-content"
                        style="
                            color: #000000;
                            font-size: 11.31px;
                            font-family: Space Grotesk, sans-serif;
                            line-height: 17px;
                            font-weight: 300;
                            padding: 30px 50px;
                        "
                        >
                        <p
                            class="hello"
                            style="
                            font-family: Barlow, sans-serif;
                            color: #112f5c;
                            font-weight: 600;
                            font-size: 22px;
                            "
                        >
                            Hello, {{last_name}} {{first_name}}!
                        </p>
                        <p style="font-family: Space Grotesk, sans-serif">
                            We are pleased to welcome you to the Alliance Reporting System. We
                            are excited to have you join our community and hope you find our
                            platform useful and efficient for all your reporting needs. The
                            Alliance Reporting System is designed to facilitate effective and
                            collaborative reporting. Below, you will find a link to access our
                            website and start exploring the features we offer.
                        </p>
                        <a href="{{client_host}}">
                            <button
                            style="
                                background-color: #035ba9;
                                color: white;
                                border: none;
                                outline: none;

                                border-radius: 5px;
                                padding: 10px 10px;
                            "
                            >
                            Explore the Alliance Reporting System

                            <img
                                style="height: 15px; padding-left: 5px"
                                src="https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/right-icon.png"
                                alt=""
                                srcset=""
                            />
                            </button>
                        </a>

                        <br /><br />

                        <p>
                            If you have any questions or need assistance, please do not hesitate
                            to contact us. We are here to help.
                        </p>
                        <p>
                            Thank you for joining us! <br />Best regards, <br />The Alliance
                            Reporting System Team
                        </p>
                        </div>
                    </div>

                    <br />
                    <footer
                        style="
                        background: #f4f7f9;
                        border: 1px solid #b0c4dd91;
                        padding: 0px 50px 30px 50px;
                        text-align: center;
                        "
                    >
                        <table
                        style="width: 100%; height: 100%; border: none; position: relative"
                        >
                        <tr>
                            <td align="center" valign="middle">
                            <img
                                style="height: 5px; margin-top: 30px; margin-bottom: 20px"
                                src="https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/email-bar-colors.png"
                                alt=""
                            />
                            </td>
                        </tr>
                        </table>

                        <table
                        style="
                            width: 100%;
                            height: 100%;
                            border: none;
                            font-size: 11px;
                            font-family: Barlow, sans-serif;
                        "
                        >
                        <tr>
                            <td>
                            <p
                                style="
                                color: #000000;
                                font-weight: 300;
                                font-family: Barlow, sans-serif;
                                text-decoration: underline;
                                "
                            >
                                Privacy policy
                            </p>
                            </td>
                            <td>
                            <div
                                style="
                                width: 6px;
                                height: 6px;
                                background-color: #d9d9d9;
                                border-radius: 20px;
                                "
                            ></div>
                            </td>
                            <td>
                            <p
                                style="
                                color: #000000;
                                font-weight: 300;
                                text-decoration: underline;
                                "
                            >
                                Terms of service
                            </p>
                            </td>
                            <td>
                            <div
                                style="
                                width: 6px;
                                height: 6px;
                                background-color: #d9d9d9;
                                border-radius: 20px;
                                "
                            ></div>
                            </td>
                            <td>
                            <p
                                style="
                                color: #000000;
                                font-weight: 300;
                                text-decoration: underline;
                                "
                            >
                                Help center
                            </p>
                            </td>
                            <td>
                            <div
                                style="
                                width: 6px;
                                height: 6px;
                                background-color: #d9d9d9;
                                border-radius: 20px;
                                "
                            ></div>
                            </td>
                            <td>
                            <p
                                style="
                                color: #000000;
                                font-weight: 300;
                                text-decoration: underline;
                                "
                            >
                                Unsubscribe
                            </p>
                            </td>
                        </tr>
                        </table>

                        <hr style="border: 0px; border-bottom: 1px solid rgb(222, 222, 222)" />

                        <p style="color: #4b5057; font-size: 10px">
                        You are receiving this mail because you registered to join the
                        Alliance Reporting System platform as a user or a creator. This also
                        shows that you agree to our Terms of use and Privacy Policies. If you
                        no longer want to receive mails from use, click the unsubscribe link
                        below to unsubscribe.
                        </p>
                        <div
                        style="text-decoration: underline; color: #000000; font-size: 12px"
                        >
                        alliancereportingsytem.cgiar.org
                        </div>
                        <img
                        style="height: 50px; margin-top: 30px; margin-bottom: 5px"
                        src="https://alliance-files-storage.s3.us-east-1.amazonaws.com/images/alliance-logo-color.png"
                        alt=""
                        />
                    </footer>
                    <br /><br /><br />
                    </article>
                </body>
                </html>
                '),
            ('${TemplateEnum.REVISE_RESULT}', '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Document</title>
                </head>
                <body>
                    <p>Dear {{sub_last_name}}, {{sub_first_name}},</p>
                    <p>
                    The result <a href="{{url}}"><b> {{indicator}} - {{result_id}} - {{title}}</b></a> has been reviewed by
                    <b>{{rev_last_name}}, {{rev_first_name}}</b>, and a revision has been
                    requested.
                    </p>

                    <p>
                    <b>Feedback: </b><br />
                    <i>"{{description}}"</i>
                    </p>

                    <p>
                    The result is now editable again. Please make the necessary adjustments
                    based on the feedback received and submit it again for review.
                    </p>
                    <p>
                    <i>
                        Best regards, {{system_name}} This is an automated email. Please do not
                        reply.
                    </i>
                    </p>
                </body>
                </html>
                '),
            ('${TemplateEnum.REJECTED_RESULT}', '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Document</title>
                </head>
                <body>
                    <p>Dear {{sub_last_name}}, {{sub_first_name}},</p>

                    <p>
                    The result <a href="{{url}}"><b> {{indicator}} - {{result_id}} - {{title}}</b></a> has been reviewed by
                    {{rev_last_name}}, {{rev_first_name}} and has been rejected.
                    </p>
                    <p>
                    <b>Feedback: </b><br />
                    "{{description}}"
                    </p>

                    <p>You may access the result here: <a href="{{url}}">{{url}}</a></p>

                    <p>
                    If you have any questions regarding this decision, please contact
                    {{rev_last_name}}, {{rev_first_name}}.
                    </p>

                    <p>Best regards,</p>
                    <p>STAR</p>
                    <br>
                    <p><i> This is an automated email. Please do not reply. </i></p>
                </body>
                </html>
                '),
            ('${TemplateEnum.APPROVAL_RESULT}', '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Document</title>
                </head>
                <body>
                    <p>Dear {{sub_last_name}}, {{sub_first_name}},</p>

                    <p>
                    The result <a href="{{url}}">{{indicator}} - {{result_id}} - {{title}}</a> has been
                    approved by {{rev_last_name}}, {{rev_first_name}}.
                    </p>
                    <p>You may access the result here: <a href="{{url}}">{{url}}</a></p>

                    <p>
                    Following this approval, the result will be included in the Alliance
                    Results Dashboard in due course.
                    </p>

                    <p>Best regards,</p>
                    <p>{{system_name}}</p>

                    <p><i> This is an automated email. Please do not reply. </i></p>
                </body>
                </html>
                '),
            ('${TemplateEnum.SUBMITTED_RESULT}', '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Document</title>
                </head>
                <body>
                    <p>Dear {{pi_name}},</p>

                    <p>
                    {{sub_last_name}}, {{sub_first_name}} has submitted a new result in ROAR
                    for the project {{project_name}}. To complete the submission process, your
                    review and approval are required.You can access the result and take action
                    by clicking the link below:
                    </p>
                    <p><a href="{{url}}">{{indicator}} - {{result_id}} - {{title}}</a></p>
                    <p>
                    If you have any questions or need assistance, please reach out through the
                    available support channels:
                    </p>
                    <p>{{support_email}}</p>
                    <p>Best regards,</p>
                    <p><i>This is an automated email. Please do not reply.</i></p>
                </body>
                </html>
                '),
            ('${TemplateEnum.ASK_HELP_TECHNICAL}', '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Document</title>
                </head>
                <body>
                    <p>Hi Technical Team,</p>
                    <p>
                    A new support request was submitted via the STAR feedback module on
                    <b>{{date}}</b> by <b>{{firstName}} {{lastName}}</b>..
                    </p>
                    <br />
                    <p>
                    The request was raised from the following section of the tool: <br />
                    <b>{{url}}</b>
                    </p>
                    <b>Request description:</b>
                    <p>{{description}}</p>
                    <br />
                    <p>Best regards,</p>
                    <b>STAR Team</b>
                </body>
                </html>
                '),
            ('${TemplateEnum.ASK_HELP_CONTENT}', '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Document</title>
                </head>
                <body>
                    <p>Dear SPRM team,</p>
                    <p>
                    A new support request was submitted via the STAR feedback module on
                    <b>{{date}}</b> by <b>{{firstName}} {{lastName}}</b>..
                    </p>
                    <br />
                    <p>
                    The request was raised from the following section of the tool: <br />
                    <b>{{url}}</b>
                    </p>
                    <b>Request description:</b>
                    <p>{{description}}</p>
                    <br />
                    <p>Best regards,</p>
                    <b>STAR Team</b>
                </body>
                </html>') `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(` delete from \`sec_template\``);
  }
}
