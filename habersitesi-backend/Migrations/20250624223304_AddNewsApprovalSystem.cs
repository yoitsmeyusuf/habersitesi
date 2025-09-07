using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace habersitesi_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddNewsApprovalSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "News",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ApprovedByUserId",
                table: "News",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsApproved",
                table: "News",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_News_ApprovedByUserId",
                table: "News",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_News_IsApproved",
                table: "News",
                column: "IsApproved");

            migrationBuilder.CreateIndex(
                name: "IX_News_IsApproved_Date",
                table: "News",
                columns: new[] { "IsApproved", "Date" });

            migrationBuilder.AddForeignKey(
                name: "FK_News_Users_ApprovedByUserId",
                table: "News",
                column: "ApprovedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_News_Users_ApprovedByUserId",
                table: "News");

            migrationBuilder.DropIndex(
                name: "IX_News_ApprovedByUserId",
                table: "News");

            migrationBuilder.DropIndex(
                name: "IX_News_IsApproved",
                table: "News");

            migrationBuilder.DropIndex(
                name: "IX_News_IsApproved_Date",
                table: "News");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "News");

            migrationBuilder.DropColumn(
                name: "ApprovedByUserId",
                table: "News");

            migrationBuilder.DropColumn(
                name: "IsApproved",
                table: "News");
        }
    }
}
