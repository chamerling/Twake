import { v1 as uuid } from "uuid";
import { ListResult, Pagination } from "../../../../core/platform/framework/api/crud-service";
import { DatabaseServiceAPI } from "../../../../core/platform/services/database/api";
import Repository from "../../../../core/platform/services/database/services/orm/repository/repository";
import User from "../../entities/user";
import UserServiceAPI, { CompaniesServiceAPI } from "../../api";
import Company, {
  CompanyPrimaryKey,
  getInstance as getCompanyInstance,
} from "../../entities/company";
import CompanyUser, {
  CompanyUserPrimaryKey,
  getInstance as getCompanyUserInstance,
} from "../../entities/company_user";

export class CompanyService implements CompaniesServiceAPI {
  version: "1";
  companyRepository: Repository<Company>;
  companyUserRepository: Repository<CompanyUser>;

  constructor(private database: DatabaseServiceAPI, private userService: UserServiceAPI) {}

  async init(): Promise<this> {
    this.companyRepository = await this.database.getRepository<Company>("group_entity", Company);
    this.companyUserRepository = await this.database.getRepository<CompanyUser>(
      "group_user",
      CompanyUser,
    );

    return this;
  }

  async createCompany(company: Company): Promise<Company> {
    const companyToCreate: Company = getCompanyInstance({
      ...company,
      ...{
        dateAdded: Date.now(),
      },
    });
    await this.companyRepository.save(companyToCreate);

    return companyToCreate;
  }

  getCompany(company: CompanyPrimaryKey): Promise<Company> {
    return this.companyRepository.findOne(company);
  }

  getCompanies(pagination?: Pagination): Promise<ListResult<Company>> {
    return this.companyRepository.find({}, { pagination });
  }

  async addUserInCompany(company: Company, user: User): Promise<CompanyUser> {
    const userInCompany = getCompanyUserInstance({
      group_id: company.id,
      user_id: user.id,
      id: uuid(),
      dateAdded: Date.now(),
    });

    await this.companyUserRepository.save(userInCompany);

    return userInCompany;
  }

  async getUsers(
    companyId: CompanyUserPrimaryKey,
    pagination?: Pagination,
  ): Promise<ListResult<CompanyUser>> {
    return this.companyUserRepository.find({ group_id: companyId.group_id }, { pagination });
  }
}
