using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace habersitesi_backend.Migrations
{
    /// <inheritdoc />
    public partial class FinalPerformanceOptimizations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Comments_NewsId",
                table: "Comments");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "News",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Summary",
                table: "News",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "User",
                table: "Comments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Text",
                table: "Comments",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Categories",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateIndex(
                name: "IX_News_Category",
                table: "News",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_News_Date",
                table: "News",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_News_Featured",
                table: "News",
                column: "Featured");

            migrationBuilder.CreateIndex(
                name: "IX_News_Featured_Date",
                table: "News",
                columns: new[] { "Featured", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_News_Title",
                table: "News",
                column: "Title");

            migrationBuilder.CreateIndex(
                name: "IX_Comments_Approved",
                table: "Comments",
                column: "Approved");

            migrationBuilder.CreateIndex(
                name: "IX_Comments_NewsId_Approved",
                table: "Comments",
                columns: new[] { "NewsId", "Approved" });

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name",
                table: "Categories",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_News_Category",
                table: "News");

            migrationBuilder.DropIndex(
                name: "IX_News_Date",
                table: "News");

            migrationBuilder.DropIndex(
                name: "IX_News_Featured",
                table: "News");

            migrationBuilder.DropIndex(
                name: "IX_News_Featured_Date",
                table: "News");

            migrationBuilder.DropIndex(
                name: "IX_News_Title",
                table: "News");

            migrationBuilder.DropIndex(
                name: "IX_Comments_Approved",
                table: "Comments");

            migrationBuilder.DropIndex(
                name: "IX_Comments_NewsId_Approved",
                table: "Comments");

            migrationBuilder.DropIndex(
                name: "IX_Categories_Name",
                table: "Categories");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "News",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.AlterColumn<string>(
                name: "Summary",
                table: "News",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "User",
                table: "Comments",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Text",
                table: "Comments",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Categories",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.CreateIndex(
                name: "IX_Comments_NewsId",
                table: "Comments",
                column: "NewsId");
        }
    }
}
