using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace habersitesi_backend.Migrations
{
    /// <inheritdoc />
    public partial class CommentReplyAndViewCounterSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastViewedAt",
                table: "News",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ViewCount",
                table: "News",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ParentId",
                table: "Comments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReplyCount",
                table: "Comments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "RelatedNews",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    NewsId = table.Column<int>(type: "integer", nullable: false),
                    RelatedNewsId = table.Column<int>(type: "integer", nullable: false),
                    SimilarityScore = table.Column<double>(type: "double precision", nullable: false),
                    Algorithm = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RelatedNews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RelatedNews_News_NewsId",
                        column: x => x.NewsId,
                        principalTable: "News",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RelatedNews_News_RelatedNewsId",
                        column: x => x.RelatedNewsId,
                        principalTable: "News",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_News_LastViewedAt",
                table: "News",
                column: "LastViewedAt");

            migrationBuilder.CreateIndex(
                name: "IX_News_ViewCount",
                table: "News",
                column: "ViewCount");

            migrationBuilder.CreateIndex(
                name: "IX_Comments_NewsId_ParentId_Approved",
                table: "Comments",
                columns: new[] { "NewsId", "ParentId", "Approved" });

            migrationBuilder.CreateIndex(
                name: "IX_Comments_ParentId",
                table: "Comments",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_RelatedNews_NewsId",
                table: "RelatedNews",
                column: "NewsId");

            migrationBuilder.CreateIndex(
                name: "IX_RelatedNews_NewsId_Score",
                table: "RelatedNews",
                columns: new[] { "NewsId", "SimilarityScore" });

            migrationBuilder.CreateIndex(
                name: "IX_RelatedNews_RelatedNewsId",
                table: "RelatedNews",
                column: "RelatedNewsId");

            migrationBuilder.CreateIndex(
                name: "IX_RelatedNews_Unique",
                table: "RelatedNews",
                columns: new[] { "NewsId", "RelatedNewsId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Comments_Comments_ParentId",
                table: "Comments",
                column: "ParentId",
                principalTable: "Comments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Comments_Comments_ParentId",
                table: "Comments");

            migrationBuilder.DropTable(
                name: "RelatedNews");

            migrationBuilder.DropIndex(
                name: "IX_News_LastViewedAt",
                table: "News");

            migrationBuilder.DropIndex(
                name: "IX_News_ViewCount",
                table: "News");

            migrationBuilder.DropIndex(
                name: "IX_Comments_NewsId_ParentId_Approved",
                table: "Comments");

            migrationBuilder.DropIndex(
                name: "IX_Comments_ParentId",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "LastViewedAt",
                table: "News");

            migrationBuilder.DropColumn(
                name: "ViewCount",
                table: "News");

            migrationBuilder.DropColumn(
                name: "ParentId",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "ReplyCount",
                table: "Comments");
        }
    }
}
