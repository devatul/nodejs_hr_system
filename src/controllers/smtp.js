import BaseAPIController from "./BaseAPIController";
import SmtpProvider from "../providers/SmtpProvider";

export class SmtpController extends BaseAPIController {

    /* Controller for Save Smtp Data  */
    save = (req, res) => {
        SmtpProvider.save(this._db.Smtp, req.checkBody, req.body, req.getValidationResult())
            .then((data) => {
                this._db.Smtp.create(data)
                    .then(res.json.bind(res))
                    .catch(this.handleErrorResponse.bind(null, res));
            })
            .catch(this.handleErrorResponse.bind(null, res));
    }

    /* Smtp data Update */
    update = (req, res) => {
        SmtpProvider.save(this._db.Smtp, req.checkBody, req.body, req.getValidationResult())
            .then((data) => {
                this._db.Smtp.update(data, { where: { id: req.params.smtpId } })
                    .then((data) => {
                        if (data[0]) {
                            this.handleSuccessResponse(res, null);
                        } else {
                            this.handleErrorResponse(res, "data not Updated");
                        }
                    })
                    .catch(this.handleErrorResponse.bind(null, res));
            })
            .catch(this.handleErrorResponse.bind(null, res));
    }

    /* Smtp data delete */
    deleteSmtp = (req, res) => {
        this._db.Smtp.destroy({ where: { id: req.params.smtpId } })
            .then((data) => {
                if (data) {
                    this.handleSuccessResponse(res, null);
                } else {
                    this.handleErrorResponse(res, "data not deleted");
                }
            })
            .catch(this.handleErrorResponse.bind(null, res));
    }

    /*Get List of Smtp data*/
    getSmtp = (req, res) => {
        this._db.Smtp.findAll()
            .then(res.json.bind(res))
            .catch(this.handleErrorResponse.bind(null, res));
    }

}

const controller = new SmtpController();
export default controller;
